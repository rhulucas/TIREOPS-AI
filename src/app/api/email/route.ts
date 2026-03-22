import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { withRateLimit } from "@/lib/api-utils";
import { getOpenAiApiKey, hasOpenAiApiKey } from "@/lib/openai-config";

const openai = new OpenAI({ apiKey: getOpenAiApiKey() });

type EmailScenario =
  | "Quote Follow-up"
  | "Invoice Delivery"
  | "Reorder Reminder"
  | "Delay Notice"
  | "Customer Inquiry Reply";

const scenarioGoals: Record<EmailScenario, string> = {
  "Quote Follow-up": "Re-engage the customer on an open pricing discussion and move the deal forward.",
  "Invoice Delivery": "Deliver a formal invoice with a clear payment summary and next steps.",
  "Reorder Reminder": "Prompt a repeat customer before the likely replenishment window closes.",
  "Delay Notice": "Explain a delay clearly while preserving confidence and offering a revised plan.",
  "Customer Inquiry Reply": "Answer the customer inquiry directly and keep the conversation moving.",
};

const scenarioFollowUp: Record<EmailScenario, string> = {
  "Quote Follow-up": "If there is no reply in 3 business days, sales should follow up by email or phone.",
  "Invoice Delivery": "If payment is not confirmed within the agreed terms, finance should send a reminder.",
  "Reorder Reminder": "If the customer shows interest, prepare a refreshed quote and stock check immediately.",
  "Delay Notice": "Operations should send a revised ETA once production or shipping timing is confirmed.",
  "Customer Inquiry Reply": "If the customer requests technical detail, route the thread to sales engineering.",
};

const scenarioSendTiming: Record<EmailScenario, string> = {
  "Quote Follow-up": "Recommended to send today during business hours.",
  "Invoice Delivery": "Recommended to send immediately after invoice approval.",
  "Reorder Reminder": "Recommended to send before the expected reorder window begins.",
  "Delay Notice": "Recommended to send as soon as the delay is confirmed internally.",
  "Customer Inquiry Reply": "Recommended to send the same business day.",
};

const scenarioToneNotes: Record<string, string> = {
  "Professional & technical": "professional, technically accurate, concise",
  "Friendly & casual": "friendly, approachable, easy to read",
  "Formal & corporate": "formal, polished, executive-ready",
  "Concise & direct": "brief, direct, action-oriented",
};

function parseInvoiceItems(items: string | null | undefined): { description?: string; quantity?: number }[] {
  if (!items) return [];
  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildContextSummary(context: {
  customerName?: string | null;
  customerEmail?: string | null;
  notes?: string;
  quote?: { category?: string | null; size?: string | null; quantity?: number | null } | null;
  order?: { orderNumber?: string; tireSpec?: string | null; quantity?: number; value?: number | null; dueDate?: Date | null } | null;
  invoice?: { invoiceNumber?: string; orderRef?: string | null; customerName?: string; paymentTerms?: string; items?: string } | null;
}) {
  const parts = [
    context.customerName ? `Customer: ${context.customerName}` : null,
    context.customerEmail ? `Customer email: ${context.customerEmail}` : null,
    context.quote?.size ? `Quote spec: ${context.quote.size}` : null,
    context.quote?.category ? `Quote category: ${context.quote.category}` : null,
    context.quote?.quantity ? `Quoted quantity: ${context.quote.quantity}` : null,
    context.order?.orderNumber ? `Order ref: ${context.order.orderNumber}` : null,
    context.order?.tireSpec ? `Order tire spec: ${context.order.tireSpec}` : null,
    context.order?.quantity ? `Order quantity: ${context.order.quantity}` : null,
    context.order?.value != null ? `Order value: $${context.order.value.toLocaleString("en-US")}` : null,
    context.invoice?.invoiceNumber ? `Invoice number: ${context.invoice.invoiceNumber}` : null,
    context.invoice?.orderRef ? `Invoice order ref: ${context.invoice.orderRef}` : null,
    context.invoice?.paymentTerms ? `Payment terms: ${context.invoice.paymentTerms}` : null,
    context.notes ? `Internal notes: ${context.notes}` : null,
  ].filter(Boolean);
  return parts.join("\n");
}

function buildSubject(
  scenario: EmailScenario,
  customerName: string,
  quote: { size?: string | null } | null,
  order: { orderNumber?: string } | null,
  invoice: { invoiceNumber?: string } | null,
) {
  switch (scenario) {
    case "Quote Follow-up":
      return `Follow-up on tire quote for ${customerName}${quote?.size ? ` | ${quote.size}` : ""}`;
    case "Invoice Delivery":
      return `Invoice ${invoice?.invoiceNumber || ""} for ${customerName}`.trim();
    case "Reorder Reminder":
      return `Planning your next tire replenishment for ${customerName}`;
    case "Delay Notice":
      return `Update on order ${order?.orderNumber || ""} for ${customerName}`.trim();
    default:
      return `Re: Tire request for ${customerName}`;
  }
}

function buildMockBody(params: {
  scenario: EmailScenario;
  customerName: string;
  tone: string;
  quote: { category?: string | null; size?: string | null; quantity?: number | null } | null;
  order: { orderNumber?: string; tireSpec?: string | null; quantity?: number; dueDate?: Date | null } | null;
  invoice: { invoiceNumber?: string; paymentTerms?: string; items?: string } | null;
  notes?: string;
}) {
  const lines: string[] = [`Dear ${params.customerName},`, ""];

  switch (params.scenario) {
    case "Quote Follow-up":
      lines.push(
        `I am following up on the tire quote we prepared${params.quote?.size ? ` for ${params.quote.size}` : ""}.`,
        params.quote?.quantity ? `The current request is for ${params.quote.quantity.toLocaleString()} units.` : "We can align the final volume once your team confirms the requirement.",
        "Please let us know if you would like us to refresh pricing, lead time, or certification details."
      );
      break;
    case "Invoice Delivery":
      lines.push(
        `Please find invoice ${params.invoice?.invoiceNumber || ""} attached for your records.`.trim(),
        params.invoice?.paymentTerms ? `Payment terms remain ${params.invoice.paymentTerms}.` : "Please review the payment terms and let us know if any detail needs adjustment.",
        "If your team needs a supporting packing list or order reference confirmation, we can provide it promptly."
      );
      break;
    case "Reorder Reminder":
      lines.push(
        `Based on your recent purchasing pattern${params.quote?.size ? ` for ${params.quote.size}` : ""}, we wanted to check whether you are planning the next replenishment cycle.`,
        "We can prepare current pricing, lead time, and stock availability for your review.",
        "If you expect volume changes this cycle, our team can update the quote accordingly."
      );
      break;
    case "Delay Notice":
      lines.push(
        `We want to provide an update on order ${params.order?.orderNumber || ""}.`.trim(),
        "There is a timing adjustment on the current shipment or production schedule.",
        params.order?.dueDate ? `Our latest internal target remains ${params.order.dueDate.toLocaleDateString("en-US")}, and we will confirm any revision immediately.` : "We will share the revised ETA as soon as the production team confirms the schedule."
      );
      break;
    default:
      lines.push(
        "Thank you for your inquiry.",
        "We reviewed your request and can support the next step with the required tire specification, commercial terms, and timeline details.",
        "Please let us know if you want us to prepare a quote, technical data, or delivery guidance."
      );
  }

  if (params.notes) {
    lines.push("", `Additional note: ${params.notes}`);
  }

  lines.push("", "Best regards,", "TireOps Sales Team");
  return lines.join("\n");
}

async function emailHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const scenario = (body.scenario || "Customer Inquiry Reply") as EmailScenario;
    const tone = body.tone || "Professional & technical";
    const customerId = body.customerId || null;
    const customerNameInput = body.customerName || null;
    const quoteId = body.quoteId || null;
    const orderId = body.orderId || null;
    const invoiceId = body.invoiceId || null;
    const notes = body.notes || body.content || body.emailText || "";

    const [customer, quote, order, invoice] = await Promise.all([
      customerId ? prisma.customer.findUnique({ where: { id: customerId } }) : null,
      quoteId ? prisma.quote.findUnique({ where: { id: quoteId } }) : null,
      orderId ? prisma.order.findUnique({ where: { id: orderId } }) : null,
      invoiceId ? prisma.invoice.findUnique({ where: { id: invoiceId } }) : null,
    ]);

    const customerName =
      customer?.company ||
      customer?.name ||
      quote?.customerName ||
      order?.customerName ||
      invoice?.customerName ||
      customerNameInput ||
      "Customer";
    const customerEmail = customer?.email || null;

    const subject = buildSubject(
      scenario,
      customerName,
      quote,
      order,
      invoice,
    );
    const goal = scenarioGoals[scenario];
    const followUp = scenarioFollowUp[scenario];
    const sendTiming = scenarioSendTiming[scenario];
    const contextSummary = buildContextSummary({
      customerName,
      customerEmail,
      notes,
      quote,
      order,
      invoice,
    });

    let emailBody: string;

    if (!hasOpenAiApiKey()) {
      emailBody = buildMockBody({
        scenario,
        customerName,
        tone,
        quote,
        order,
        invoice,
        notes,
      });
    } else {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a tire industry sales and operations email assistant. Write one ready-to-send business email. Tone guidance: ${scenarioToneNotes[tone] || tone}. Scenario goal: ${goal}. Keep the language concrete, customer-facing, and commercially useful.`,
          },
          {
            role: "user",
            content: `Prepare a ${scenario} email.\n\nContext:\n${contextSummary}\n\nOutput only the email body, not JSON.`,
          },
        ],
      });
      emailBody = completion.choices[0]?.message?.content || buildMockBody({
        scenario,
        customerName,
        tone,
        quote,
        order,
        invoice,
        notes,
      });
    }

    const result = `Subject: ${subject}\n\n${emailBody}`;

    return NextResponse.json({
      result,
      subject,
      body: emailBody,
      goal,
      followUp,
      sendTiming,
      contextSummary,
      previewItems: parseInvoiceItems(invoice?.items).slice(0, 3),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: String(e), result: "AI call failed" },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(emailHandler);
