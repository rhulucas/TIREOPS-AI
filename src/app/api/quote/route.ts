import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/api-utils";
import { getOpenAiApiKey, hasOpenAiApiKey } from "@/lib/openai-config";

const openai = new OpenAI({ apiKey: getOpenAiApiKey() });

const categoryBasePrice: Record<string, number> = {
  "Passenger Car (PCR)": 78,
  "SUV / Light Truck (LT)": 112,
  "Commercial Truck (TBR)": 248,
  "Off-The-Road (OTR)": 890,
  "Ultra High Performance (UHP)": 128,
  "Winter / All-Season": 96,
  "Agricultural / Industrial": 420,
};

function inferCustomerType(totalOrders: number, totalValue: number) {
  if (totalOrders >= 8 && totalValue >= 200000) return "Strategic repeat fleet account";
  if (totalOrders >= 4) return "Repeat commercial buyer";
  if (totalValue >= 120000) return "Large opportunity account";
  return "New or occasional buyer";
}

function inferOpportunityLevel(quantity: number, totalOrders: number, hasHistory: boolean) {
  if (quantity >= 1000 && (totalOrders >= 3 || hasHistory)) return "High";
  if (quantity >= 400 || totalOrders >= 2) return "Medium";
  return "Low";
}

function inferLeadTime(category: string, quantity: number) {
  if (category.includes("OTR")) return quantity >= 100 ? "8-10 weeks" : "6-8 weeks";
  if (category.includes("Commercial Truck")) return quantity >= 800 ? "5-7 weeks" : "4-6 weeks";
  if (category.includes("Agricultural")) return "6-8 weeks";
  return quantity >= 1000 ? "4-5 weeks" : "3-4 weeks";
}

function inferWinProbability({
  opportunityLevel,
  customerOrders,
  riskFlags,
  notes,
}: {
  opportunityLevel: "High" | "Medium" | "Low";
  customerOrders: number;
  riskFlags: string[];
  notes: string;
}) {
  let score = opportunityLevel === "High" ? 72 : opportunityLevel === "Medium" ? 54 : 34;
  if (customerOrders >= 6) score += 12;
  else if (customerOrders >= 3) score += 6;
  if (/urgent|rush|asap/i.test(notes)) score -= 8;
  score -= riskFlags.length * 4;
  const clamped = Math.min(Math.max(score, 18), 92);
  const band = clamped >= 70 ? "High" : clamped >= 45 ? "Medium" : "Low";
  return { score: clamped, band };
}

function inferNegotiationAngle({
  category,
  quantity,
  notes,
  customerOrders,
  riskFlags,
}: {
  category: string;
  quantity: number;
  notes: string;
  customerOrders: number;
  riskFlags: string[];
}) {
  if (/DOT|ECE|cert/i.test(notes)) {
    return "Lead with compliance and certification readiness before discussing concessions on price.";
  }
  if (/urgent|rush|asap/i.test(notes)) {
    return "Lead with confirmed lead time and production slot availability. Price should be positioned after timing is secured.";
  }
  if (category.includes("Commercial Truck") && quantity >= 800) {
    return "Lead with supply stability, fleet support, and volume-based pricing. This customer will care about continuity as much as unit cost.";
  }
  if (customerOrders >= 3 && riskFlags.length <= 1) {
    return "Lead with relationship continuity and historical buying pattern. Use pricing as reinforcement, not the only lever.";
  }
  if (quantity >= 1000) {
    return "Lead with volume economics and structured payment terms. Position the quote as a scale purchase opportunity.";
  }
  return "Lead with price clarity and a quick-turn quote. Keep the offer simple and confirm remaining technical details before escalation.";
}

function buildRiskFlags({
  quantity,
  category,
  notes,
  estimatedUnitPrice,
  historicalUnitPrice,
}: {
  quantity: number;
  category: string;
  notes: string;
  estimatedUnitPrice: number;
  historicalUnitPrice: number | null;
}) {
  const flags: string[] = [];
  if (quantity > 0 && quantity < 200) flags.push("Low quantity request may not justify best-volume pricing.");
  if (category.includes("Commercial Truck") && quantity >= 1000) flags.push("Large TBR order may require production slot reservation.");
  if (/DOT|ECE|cert/i.test(notes)) flags.push("Certification requirements should be confirmed before release.");
  if (/urgent|rush|asap/i.test(notes)) flags.push("Urgent timing may require surcharge or revised lead time.");
  if (historicalUnitPrice && Math.abs(estimatedUnitPrice - historicalUnitPrice) / historicalUnitPrice > 0.12) {
    flags.push("Recommended price differs materially from historical realized pricing.");
  }
  return flags;
}

function inferOrderOutcome(status: string) {
  if (status === "SHIPPED") return "Won / shipped";
  if (status === "PRODUCTION" || status === "QC_CHECK") return "Won / in fulfillment";
  if (status === "URGENT") return "Won / urgent fulfillment";
  return "Open";
}

async function quoteHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customer,
      category,
      size,
      loadIndex,
      speedRating,
      quantity,
      compound,
      notes,
      customerId,
    } = body;
    const normalizedQuantity = quantity ? Number(quantity) : 0;
    const spec = `size ${size || "N/A"}, load index ${loadIndex || "N/A"}, speed rating ${speedRating || "N/A"}, quantity ${quantity || "N/A"}, compound ${compound || "N/A"}`;
    const session = await auth();

    const [customerRecord, similarOrders, customerOrders, customerQuotes] = await Promise.all([
      customerId ? prisma.customer.findUnique({ where: { id: customerId } }) : null,
      prisma.order.findMany({
        where: {
          ...(size ? { tireSpec: { contains: size, mode: "insensitive" } } : {}),
          status: { in: ["PRODUCTION", "QC_CHECK", "SHIPPED", "URGENT"] },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      customerId
        ? prisma.order.findMany({
            where: { customerId },
            orderBy: { createdAt: "desc" },
            take: 12,
          })
        : [],
      customerId
        ? prisma.quote.findMany({
            where: { customerId },
            orderBy: { createdAt: "desc" },
            take: 8,
          })
        : [],
    ]);

    const historicalUnitValues = [...similarOrders, ...customerOrders]
      .filter((order) => order.value && order.quantity > 0)
      .map((order) => (order.value || 0) / order.quantity);
    const historicalUnitPrice = historicalUnitValues.length
      ? historicalUnitValues.reduce((sum, value) => sum + value, 0) / historicalUnitValues.length
      : null;

    const basePrice = categoryBasePrice[category || ""] || 95;
    const quantityFactor =
      normalizedQuantity >= 1200 ? 0.9 : normalizedQuantity >= 800 ? 0.94 : normalizedQuantity >= 400 ? 0.98 : 1.05;
    const compoundFactor =
      /premium|high-silica|winter|soft/i.test(compound || "") ? 1.08 : /economy/i.test(compound || "") ? 0.95 : 1;
    const estimatedUnitPrice = Math.round((historicalUnitPrice || basePrice) * quantityFactor * compoundFactor);
    const estimatedTotal = normalizedQuantity > 0 ? estimatedUnitPrice * normalizedQuantity : null;
    const customerType = inferCustomerType(customerOrders.length, customerOrders.reduce((sum, order) => sum + (order.value || 0), 0));
    const opportunityLevel = inferOpportunityLevel(normalizedQuantity, customerOrders.length, similarOrders.length > 0);
    const leadTime = inferLeadTime(category || "", normalizedQuantity);
    const paymentTerms = customerOrders.length >= 3 ? "Net 30" : normalizedQuantity >= 1000 ? "30% deposit / balance before shipment" : "50% deposit / balance before shipment";
    const riskFlags = buildRiskFlags({
      quantity: normalizedQuantity,
      category: category || "",
      notes: notes || "",
      estimatedUnitPrice,
      historicalUnitPrice,
    });
    const suggestedSalesAction =
      opportunityLevel === "High"
        ? "Prepare a formal quote this week, confirm lead time with operations, and schedule direct follow-up with the customer."
        : opportunityLevel === "Medium"
          ? "Send a structured quote draft and confirm quantity, certifications, and required delivery timing."
          : "Qualify the opportunity further before committing aggressive pricing or production capacity.";
    const winProbability = inferWinProbability({
      opportunityLevel,
      customerOrders: customerOrders.length,
      riskFlags,
      notes: notes || "",
    });
    const negotiationAngle = inferNegotiationAngle({
      category: category || "",
      quantity: normalizedQuantity,
      notes: notes || "",
      customerOrders: customerOrders.length,
      riskFlags,
    });
    const historicalReference = {
      customerOrders: customerOrders.length,
      recentQuotes: customerQuotes.length,
      avgHistoricalUnitPrice: historicalUnitPrice ? Math.round(historicalUnitPrice) : null,
      lastOrderDate: customerOrders[0]?.createdAt.toISOString() || null,
    };
    const similarWonQuotes = similarOrders.slice(0, 4).map((order) => ({
      id: order.id,
      customerName: order.customerName || "Unknown customer",
      tireSpec: order.tireSpec || size || "Unknown spec",
      quantity: order.quantity,
      unitPrice: order.value && order.quantity > 0 ? Math.round(order.value / order.quantity) : null,
      outcome: inferOrderOutcome(order.status),
      createdAt: order.createdAt.toISOString(),
    }));
    let result: string;
    if (!hasOpenAiApiKey()) {
      result = `[Mock Quote]\nCustomer: ${customerRecord?.company || customerRecord?.name || customer || "—"}\nCategory: ${category || "—"}\n${spec}\nEstimated unit price: $${estimatedUnitPrice}\nEstimated total: ${estimatedTotal ? `$${estimatedTotal.toLocaleString("en-US")}` : "Pending quantity"}\nLead time: ${leadTime}\nPayment terms: ${paymentTerms}\nSpecial notes: ${notes || "—"}\n\nEU Label: B/C/72dB | DOT/ECE: compliant`;
    } else {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a tire industry sales rep writing a quote summary. Output plain text only — no markdown, no asterisks, no bullet dashes. Format each field on its own line as "Label: Value". Use exactly these labels in this order: Customer, Tire Spec, Category, Load Index, Speed Rating, Unit Price, Total Value, Lead Time, Payment Terms, EU Label, Compliance, Notes. If a value is not applicable write N/A. After the fields, add one blank line then a short 1-sentence sales note.`,
          },
          {
            role: "user",
            content: `Generate a quote for: Customer: ${customerRecord?.company || customerRecord?.name || customer || "—"}, Category: ${category || "—"}, ${spec}, Unit price: $${estimatedUnitPrice}${estimatedTotal ? `, Total: $${estimatedTotal.toLocaleString("en-US")}` : ""}, Lead time: ${leadTime}, Payment: ${paymentTerms}, Notes: ${notes || "none"}.`,
          },
        ],
      });
      result = completion.choices[0]?.message?.content || "No output";
    }
    let createdQuoteId: string | null = null;
    let createdQuoteSummary:
      | {
          id: string;
          customerName: string | null;
          category: string | null;
          size: string;
          quantity: number | null;
          customerId: string | null;
          createdAt: string;
        }
      | null = null;
    if (session?.user) {
      const quoteData = {
        customerName: customer || customerRecord?.company || customerRecord?.name || null,
        category: category || null,
        size: size || "",
        loadIndex: loadIndex || null,
        speedRating: speedRating || null,
        quantity: quantity ? Number(quantity) : null,
        compound: compound || null,
        notes: notes || null,
        result,
        customerId: customerId || null,
        userId: (session.user as { id?: string }).id || null,
      };
      const createdQuote = await prisma.quote.create({ data: quoteData }).catch(async (err) => {
        if (err?.code === "P2003") {
          return prisma.quote.create({ data: { ...quoteData, userId: null } });
        }
        throw err;
      });
      createdQuoteId = createdQuote.id;
      createdQuoteSummary = {
        id: createdQuote.id,
        customerName: createdQuote.customerName,
        category: createdQuote.category,
        size: createdQuote.size,
        quantity: createdQuote.quantity,
        customerId: createdQuote.customerId,
        createdAt: createdQuote.createdAt.toISOString(),
      };
    }
    return NextResponse.json({
      result,
      createdQuoteId,
      createdQuoteSummary,
      salesAssistant: {
        customerType,
        opportunityLevel,
        recommendedQuote: {
          estimatedUnitPrice,
          estimatedTotal,
          leadTime,
          paymentTerms,
        },
        historicalReference,
        similarWonQuotes,
        riskFlags,
        suggestedSalesAction,
        winProbability,
        negotiationAngle,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: String(e), result: "AI call failed, check OPENAI_API_KEY" },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(quoteHandler);
