import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withRateLimit } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getOpenAiApiKey, hasOpenAiApiKey } from "@/lib/openai-config";

const openai = new OpenAI({ apiKey: getOpenAiApiKey() });

type LineItem = { description: string; quantity: number; unitPrice: number };

function normalizeLineItems(input: unknown): LineItem[] {
  const parsed = typeof input === "string" ? JSON.parse(input) : input;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => ({
      description: String((item as { description?: unknown }).description || "").trim(),
      quantity: Number((item as { quantity?: unknown }).quantity) || 0,
      unitPrice: Number((item as { unitPrice?: unknown }).unitPrice) || 0,
    }))
    .filter((item) => item.description);
}

function fmtCurrency(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatInvoice(data: {
  customerName: string;
  invoiceNumber: string;
  address: string;
  orderRef: string;
  lineItems: LineItem[];
  paymentTerms: string;
  taxRate: number;
  notes: string[];
}) {
  const { customerName, invoiceNumber, address, orderRef, lineItems, paymentTerms, taxRate, notes } = data;
  const rate = taxRate / 100;
  let subtotal = 0;
  const lines = lineItems.map((r) => {
    const total = r.quantity * r.unitPrice;
    subtotal += total;
    return { ...r, total };
  });
  const tax = subtotal * rate;
  const total = subtotal + tax;
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  let out = `INVOICE\n`;
  out += `Invoice Number: ${invoiceNumber}\n`;
  out += `Invoice Date: ${date}\n\n`;
  out += `Bill To:\n${customerName}\n${address || "Address pending"}\n\n`;
  out += `Order Reference: ${orderRef || "—"}\n\n`;
  out += `Item Description          Qty      Unit Price (USD)      Total (USD)\n`;
  out += `${"—".repeat(70)}\n`;
  for (const l of lines) {
    out += `${l.description.slice(0, 30).padEnd(30)} ${String(l.quantity).padStart(6)} ${fmtCurrency(l.unitPrice).padStart(18)} ${fmtCurrency(l.total).padStart(18)}\n`;
  }
  out += `${"—".repeat(70)}\n`;
  out += `Subtotal:                                                ${fmtCurrency(subtotal).padStart(18)}\n`;
  out += `Tax (${taxRate}%):                                             ${fmtCurrency(tax).padStart(18)}\n`;
  out += `Total:                                                  ${fmtCurrency(total).padStart(18)}\n\n`;
  out += `Payment Terms: ${paymentTerms}\n`;
  if (notes.length > 0) {
    out += `Commercial Notes:\n`;
    for (const note of notes) out += `- ${note}\n`;
  }
  out += `\nThank you for your business!`;
  return out;
}

function buildSuggestedLineItems(args: {
  order: {
    orderNumber: string;
    tireSpec: string | null;
    quantity: number;
    value: number | null;
    status: string;
  } | null;
  existingItems: LineItem[];
}) {
  const { order, existingItems } = args;
  if (!order) return existingItems;
  const inferredUnitPrice =
    order.value && order.quantity > 0
      ? Math.round((order.value / order.quantity) * 100) / 100
      : 85;
  const items: LineItem[] = [
    {
      description: order.tireSpec || "Tire order line item",
      quantity: order.quantity || 0,
      unitPrice: inferredUnitPrice,
    },
  ];
  if (order.quantity >= 300) {
    items.push({ description: "Freight & handling", quantity: 1, unitPrice: 500 });
  }
  if (order.status === "URGENT") {
    items.push({ description: "Priority production surcharge", quantity: 1, unitPrice: 350 });
  }
  return items;
}

async function invoiceHandler(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const {
      customerId,
      customerName,
      invoiceNumber,
      address,
      orderRef,
      items,
      paymentTerms,
      taxRate,
    } = body;
    const parsedItems = normalizeLineItems(items);
    const customer = customerId
      ? await prisma.customer.findUnique({ where: { id: String(customerId) } })
      : null;
    const order = orderRef
      ? await prisma.order.findFirst({
          where: {
            orderNumber: { equals: String(orderRef), mode: "insensitive" },
            ...(customerId ? { customerId: String(customerId) } : {}),
          },
        })
      : null;

    const suggestedItems = buildSuggestedLineItems({ order, existingItems: parsedItems });
    const effectiveCustomerName = String(customerName || customer?.company || customer?.name || "").trim();
    const effectiveAddress = String(address || customer?.address || "").trim();
    const effectiveTaxRate = Number(taxRate) || 0;
    const effectivePaymentTerms =
      paymentTerms ||
      (order?.value && order.value >= 40000 ? "Net 15" : "Net 30");

    const warnings: string[] = [];
    if (!effectiveCustomerName) warnings.push("Customer name is missing.");
    if (!effectiveAddress) warnings.push("Customer address is missing.");
    if (orderRef && !order) warnings.push("Order reference did not match an existing order.");
    if (!orderRef) warnings.push("Invoice is not linked to an order reference.");
    if (effectiveTaxRate === 0) warnings.push("Tax rate is 0%. Confirm this is intentional.");
    if (order && order.value && suggestedItems.length > 0) {
      const subtotal = suggestedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      if (Math.abs(subtotal - order.value) > Math.max(500, order.value * 0.08)) {
        warnings.push("Suggested invoice subtotal differs noticeably from the linked order value.");
      }
    }

    const commercialNotes = [
      order ? `Derived primary line item from order ${order.orderNumber}.` : "No linked order found; review line items manually.",
      order?.status === "URGENT" ? "Urgent order detected. Confirm expedited surcharge and dispatch timing." : null,
      customer?.address ? null : "Customer master data is incomplete. Consider updating the customer record after issuing this invoice.",
    ].filter(Boolean) as string[];

    let aiNotes: string[] = [];
    if (hasOpenAiApiKey()) {
      const summary = `Customer: ${effectiveCustomerName || "—"}, Invoice #${invoiceNumber || "—"}, Order Ref: ${orderRef || "—"}, Payment: ${effectivePaymentTerms}, Tax: ${effectiveTaxRate}%. Order status: ${order?.status || "—"}. Items: ${JSON.stringify(suggestedItems)}. Existing warnings: ${warnings.join(" | ") || "none"}`;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a tire industry finance assistant. Return up to three concise commercial review notes, one per line, focused on billing completeness, customer communication, and potential invoice risks.",
          },
          {
            role: "user",
            content: summary,
          },
        ],
      });
      aiNotes = (completion.choices[0]?.message?.content || "")
        .split("\n")
        .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 3);
    }

    const result = formatInvoice({
      customerName: effectiveCustomerName || "Unknown customer",
      invoiceNumber: String(invoiceNumber || "INV-XXXX"),
      address: effectiveAddress,
      orderRef: String(orderRef || ""),
      lineItems: suggestedItems,
      paymentTerms: effectivePaymentTerms,
      taxRate: effectiveTaxRate,
      notes: [...commercialNotes, ...aiNotes],
    });

    return NextResponse.json({
      result,
      warnings,
      lineItems: suggestedItems,
      paymentTerms: effectivePaymentTerms,
      taxRate: effectiveTaxRate,
      matchedOrder: order
        ? {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            tireSpec: order.tireSpec,
            quantity: order.quantity,
            value: order.value,
          }
        : null,
      notes: [...commercialNotes, ...aiNotes],
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: String(e), result: "AI call failed" },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(invoiceHandler);
