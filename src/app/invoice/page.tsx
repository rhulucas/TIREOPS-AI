"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Mail, Save, Search, RotateCcw, Plus, Trash2, WandSparkles } from "lucide-react";
import { safeJson } from "@/lib/safe-json";
import { CustomerAutocomplete, type Customer } from "@/components/CustomerAutocomplete";

const paymentTerms = ["Net 30", "Net 15", "Net 45", "Net 60", "Due on receipt"];

type LineItem = { description: string; quantity: number; unitPrice: number };

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  orderRef: string | null;
  orderId?: string | null;
  status?: string | null;
  paidAt?: string | null;
  createdAt: string;
  preview?: string | null;
  items?: string | null;
  taxRate?: number | null;
  paymentTerms?: string | null;
};

function calcInvoiceTotal(row: InvoiceRow): number {
  if (!row.items) return 0;
  try {
    const items: LineItem[] = JSON.parse(row.items);
    const sub = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    return sub * (1 + (row.taxRate ?? 0) / 100);
  } catch {
    return 0;
  }
}

type OrderSuggestion = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string | null;
  tireSpec: string | null;
  quantity: number;
  value: number | null;
  dueDate: string | null;
  createdAt: string;
  customer?: Customer | null;
};

type InvoiceAssistantResponse = {
  result?: string;
  warnings?: string[];
  notes?: string[];
  lineItems?: LineItem[];
  paymentTerms?: string;
  taxRate?: number;
  matchedOrder?: {
    id: string;
    orderNumber: string;
    status: string;
    tireSpec: string | null;
    quantity: number;
    value: number | null;
  } | null;
  error?: string;
};

type DraftSeed = {
  orderNumber: string;
  customerName: string;
  tireSpec: string;
  quantity: number;
  value: number;
};

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function nextInvoiceNumber() {
  return `INV-${Date.now().toString().slice(-6)}`;
}

function formatInvoice(data: {
  customerName: string;
  invoiceNumber: string;
  address: string;
  orderRef: string;
  lineItems: LineItem[];
  paymentTerms: string;
  taxRate: number;
}): string {
  const { customerName, invoiceNumber, address, orderRef, lineItems, paymentTerms, taxRate } = data;
  const rate = taxRate / 100;
  let subtotal = 0;
  const lines = lineItems
    .filter((r) => r.description.trim())
    .map((r) => {
      const total = r.quantity * r.unitPrice;
      subtotal += total;
      return { desc: r.description, qty: r.quantity, up: r.unitPrice, total };
    });
  const tax = subtotal * rate;
  const total = subtotal + tax;
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  let out = `INVOICE\n`;
  out += `Invoice Number: ${invoiceNumber}\n`;
  out += `Invoice Date: ${date}\n\n`;
  out += `Bill To:\n${customerName}\n${address.replace(/\n/g, "\n")}\n\n`;
  out += `Order Reference: ${orderRef || "—"}\n\n`;
  out += `Item Description          Qty      Unit Price (USD)      Total (USD)\n`;
  out += `${"—".repeat(70)}\n`;
  for (const l of lines) {
    out += `${l.desc.slice(0, 30).padEnd(30)} ${String(l.qty).padStart(6)} ${fmt(l.up).padStart(18)} ${fmt(l.total).padStart(18)}\n`;
  }
  out += `${"—".repeat(70)}\n`;
  out += `Subtotal:                                                ${fmt(subtotal).padStart(18)}\n`;
  out += `Tax (${taxRate}%):                                             ${fmt(tax).padStart(18)}\n`;
  out += `Total:                                                  ${fmt(total).padStart(18)}\n\n`;
  out += `Payment Terms: ${paymentTerms}\n\n`;
  out += `Thank you for your business!`;
  return out;
}

function InvoiceAIContent() {
  const [customerName, setCustomerName] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState(nextInvoiceNumber);
  const [address, setAddress] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", quantity: 0, unitPrice: 0 }]);
  const [paymentTermsVal, setPaymentTermsVal] = useState("Net 30");
  const [taxRate, setTaxRate] = useState("8");
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [invoiceYear, setInvoiceYear] = useState("all");
  const [previewModal, setPreviewModal] = useState<InvoiceRow | null>(null);
  const [orderSuggestions, setOrderSuggestions] = useState<OrderSuggestion[]>([]);
  const [assistantWarnings, setAssistantWarnings] = useState<string[]>([]);
  const [assistantNotes, setAssistantNotes] = useState<string[]>([]);
  const [matchedOrder, setMatchedOrder] = useState<InvoiceAssistantResponse["matchedOrder"]>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [draftingEmail, setDraftingEmail] = useState(false);
  const [draftSeed, setDraftSeed] = useState<DraftSeed | null>(null);
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const invoicePageSize = 20;
  const availableYears = ["all", "2026", "2025", "2024", "2023", "2022", "2021"];
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * ((Number(taxRate) || 0) / 100);
  const grandTotal = subtotal + taxAmount;
  const recommendedNextStep =
    assistantWarnings.length > 0
      ? "Resolve the flagged issues before saving or sending this invoice."
      : matchedOrder
        ? "Draft looks consistent. Save the invoice, then generate the customer delivery email."
        : "Review the draft manually and confirm the pricing before saving.";

  const loadInvoices = async () => {
    const params = new URLSearchParams({
      page: String(invoicePage),
      pageSize: String(invoicePageSize),
    });
    if (invoiceSearch) params.set("q", invoiceSearch);
    if (invoiceYear !== "all") params.set("year", invoiceYear);
    const res = await fetch(`/api/invoices?${params.toString()}`);
    const data = await safeJson<{ invoices?: InvoiceRow[]; total?: number }>(res);
    setInvoices(data.invoices || []);
    setInvoiceTotal(data.total || 0);
  };

  const loadOrders = async (customerId?: string) => {
    const params = new URLSearchParams();
    params.set("take", "20");
    if (customerId) params.set("customerId", customerId);
    const res = await fetch(`/api/orders?${params.toString()}`);
    const data = await safeJson<{ orders?: OrderSuggestion[] }>(res);
    setOrderSuggestions(data.orders || []);
  };

  useEffect(() => {
    loadInvoices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceSearch, invoicePage, invoiceYear]);

  useEffect(() => {
    setInvoicePage(1);
  }, [invoiceSearch, invoiceYear]);

  useEffect(() => {
    if (selectedCustomer?.id) {
      loadOrders(selectedCustomer.id);
    } else {
      setOrderSuggestions([]);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    const orderIdFromQuery = searchParams.get("orderId") || "";
    const orderRefFromQuery = searchParams.get("orderRef") || "";
    const orderNumber = searchParams.get("order") || orderRefFromQuery;
    const displayOrder = searchParams.get("displayOrder") || orderNumber || "";
    const customerIdFromQuery = searchParams.get("customerId") || "";
    const customerFromQuery = searchParams.get("customer") || "";
    const tireSpecFromQuery = searchParams.get("tireSpec") || "";
    const quantityFromQuery = Number(searchParams.get("quantity") || 0) || 0;
    const valueFromQuery = searchParams.get("value") || "";

    if (orderIdFromQuery) setLinkedOrderId(orderIdFromQuery);

    if (!orderNumber && !displayOrder && !customerFromQuery && !customerIdFromQuery && !orderIdFromQuery) return;

    const loadOrderFromQuery = async () => {
      if (customerFromQuery) setCustomerName(customerFromQuery);
      if (displayOrder) setOrderRef(displayOrder);
      if (tireSpecFromQuery) {
        const parsedValue = Number(String(valueFromQuery).replace(/[^\d.-]/g, "")) || 0;
        const inferredUnitPrice =
          quantityFromQuery > 0 && parsedValue > 0 ? Math.round((parsedValue / quantityFromQuery) * 100) / 100 : 85;
        setLineItems([{ description: tireSpecFromQuery, quantity: quantityFromQuery, unitPrice: inferredUnitPrice }]);
        setDraftSeed({
          orderNumber: displayOrder || orderNumber || "",
          customerName: customerFromQuery,
          tireSpec: tireSpecFromQuery,
          quantity: quantityFromQuery,
          value: parsedValue,
        });
      }

      if (customerIdFromQuery) {
        const customerRes = await fetch(`/api/customers/${encodeURIComponent(customerIdFromQuery)}`);
        const customerData = await safeJson<{ customer?: Customer; error?: string }>(customerRes);
        if (customerRes.ok && customerData.customer) {
          setSelectedCustomer(customerData.customer);
          if (customerData.customer.address) setAddress(customerData.customer.address);
          if (!customerFromQuery) {
            setCustomerName(customerData.customer.company || customerData.customer.name || "");
          }
        }
      }

      if (!orderNumber) return;

      const res = await fetch(`/api/orders?q=${encodeURIComponent(orderNumber)}&take=10`);
      const data = await safeJson<{ orders?: OrderSuggestion[] }>(res);
      const order = (data.orders || []).find((item) => item.orderNumber === orderNumber);
      if (!order) return;
      setOrderRef(displayOrder || order.orderNumber);
      const displayCustomer = order.customer?.company || order.customer?.name || order.customerName || "";
      if (displayCustomer) setCustomerName(displayCustomer);
      if (order.customer?.address) setAddress(order.customer.address);
      if (order.customer) setSelectedCustomer(order.customer);
    };

    loadOrderFromQuery();
  }, [searchParams]);

  const handleCustomerSelect = (v: string, c?: Customer | null) => {
    setCustomerName(v);
    setSelectedCustomer(c ?? null);
    if (c?.address) setAddress(c.address);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setAssistantWarnings([]);
    setAssistantNotes([]);
    try {
      const res = await fetch("/api/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer?.id,
          customerName,
          invoiceNumber,
          address,
          orderRef,
          items: lineItems,
          paymentTerms: paymentTermsVal,
          taxRate: Number(taxRate) || 0,
        }),
      });
      const data = await safeJson<InvoiceAssistantResponse>(res);
      if (!res.ok) throw new Error(data.error || "Failed to generate invoice");
      if (data.lineItems?.length) setLineItems(data.lineItems);
      if (data.paymentTerms) setPaymentTermsVal(data.paymentTerms);
      if (typeof data.taxRate === "number") setTaxRate(String(data.taxRate));
      setPreview(data.result || null);
      const fallbackWarnings = [...(data.warnings || [])];
      const fallbackNotes = [...(data.notes || [])];
      let fallbackMatchedOrder = data.matchedOrder || null;

      if (!fallbackMatchedOrder && draftSeed) {
        fallbackMatchedOrder = {
          id: "draft-seed",
          orderNumber: draftSeed.orderNumber || orderRef,
          status: "DRAFT",
          tireSpec: draftSeed.tireSpec || null,
          quantity: draftSeed.quantity,
          value: draftSeed.value || null,
        };
        const missingOrderIdx = fallbackWarnings.findIndex((warning) =>
          warning.includes("Order reference did not match an existing order.")
        );
        if (missingOrderIdx >= 0) fallbackWarnings.splice(missingOrderIdx, 1);
        fallbackNotes.unshift("Using order details passed from the Orders page. This draft is not linked to a persisted database order.");
      }

      setAssistantWarnings(fallbackWarnings);
      setAssistantNotes(fallbackNotes);
      setMatchedOrder(fallbackMatchedOrder);
      setEmailDraft(null);
    } catch (e) {
      alert(String(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleDraftEmail = async () => {
    const effectivePreview =
      preview ||
      formatInvoice({
        customerName,
        invoiceNumber,
        address,
        orderRef,
        lineItems,
        paymentTerms: paymentTermsVal,
        taxRate: Number(taxRate) || 0,
      });
    setDraftingEmail(true);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: "Invoice delivery",
          content: `Write a customer-facing email to send this invoice.\nCustomer: ${customerName || "Unknown customer"}\nInvoice Number: ${invoiceNumber}\nOrder Ref: ${orderRef || "—"}\nPayment Terms: ${paymentTermsVal}\nInvoice Preview:\n${effectivePreview}`,
          tone: "Formal & corporate",
        }),
      });
      const data = await safeJson<{ result?: string; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to draft email");
      setEmailDraft(data.result || null);
    } catch (e) {
      alert(String(e));
    } finally {
      setDraftingEmail(false);
    }
  };

  const handleSave = async () => {
    const validItems = lineItems.filter((r) => r.description.trim());
    if (!customerName.trim() || !address.trim() || validItems.length === 0) {
      alert("Customer name, address, and at least one line item are required.");
      return;
    }
    if (!confirm("Save this invoice?")) return;
    const previewText =
      preview ||
      formatInvoice({
        customerName,
        invoiceNumber,
        address,
        orderRef,
        lineItems: validItems,
        paymentTerms: paymentTermsVal,
        taxRate: Number(taxRate) || 0,
      });
    const optimisticRow: InvoiceRow = {
      id: "pending",
      invoiceNumber,
      customerName,
      orderRef: orderRef || null,
      createdAt: new Date().toISOString(),
      preview: previewText,
    };
    setInvoices((prev) => [optimisticRow, ...prev]);
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber,
          customerId: selectedCustomer?.id,
          customerName,
          customerAddress: address,
          orderRef: orderRef || null,
          orderId: linkedOrderId || null,
          items: JSON.stringify(validItems),
          paymentTerms: paymentTermsVal,
          taxRate: Number(taxRate) || 0,
          preview: previewText,
        }),
      });
      if (!res.ok) {
        const err = await safeJson<{ error?: string }>(res);
        throw new Error(err.error || "Failed to save");
      }
      const data = await safeJson<{ invoice?: InvoiceRow }>(res);
      if (data.invoice) {
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === "pending" ? { ...data.invoice!, id: data.invoice!.id } : inv))
        );
        setInvoiceNumber(nextInvoiceNumber());
      }
    } catch (e) {
      setInvoices((prev) => prev.filter((inv) => inv.id !== "pending"));
      alert(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    if (!confirm("Mark this invoice as paid?")) return;
    setMarkingPaid(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      if (!res.ok) throw new Error("Failed");
      setInvoices((prev) => prev.map((inv) => inv.id === invoiceId ? { ...inv, status: "PAID", paidAt: new Date().toISOString() } : inv));
    } catch {
      alert("Failed to update payment status");
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleSendInvoiceEmail = async (inv: InvoiceRow) => {
    setSendingEmail(inv.id);
    try {
      const total = calcInvoiceTotal(inv);
      const totalStr = total > 0 ? `$${formatCurrency(total)}` : "(see invoice)";
      const subject = `Invoice ${inv.invoiceNumber} — ${inv.customerName}`;
      const initialMessage =
        `Dear ${inv.customerName},\n\nPlease find your invoice below.\n\n` +
        `• Invoice Number: ${inv.invoiceNumber}\n` +
        `• Order Reference: ${inv.orderRef || "—"}\n` +
        `• Payment Terms: ${inv.paymentTerms || "Net 30"}\n` +
        `• Invoice Total: ${totalStr}\n\n` +
        (inv.preview ? `Invoice Details:\n${inv.preview}\n\n` : "") +
        `Please remit payment per the terms above. If you have any questions, don't hesitate to reach out.\n\nBest regards,\nTireOps Billing Team`;
      const res = await fetch("/api/email-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          customerName: inv.customerName,
          initialMessage,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceTotal: total,
        }),
      });
      if (!res.ok) throw new Error("Failed to create email thread");
      const data = await res.json();
      router.push(`/email?threadId=${data.thread?.id}`);
    } catch (e) {
      alert(String(e));
    } finally {
      setSendingEmail(null);
    }
  };

  const inputClass =
    "form-input w-full rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-2.5 text-[13.5px] text-[var(--text)] placeholder-[var(--text-light)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(29,111,219,0.12)] focus:outline-none";
  const labelClass = "form-label mb-1.5 block text-xs font-semibold text-[var(--text-mid)]";
  const btnPrimary =
    "inline-flex items-center gap-2 rounded-[7px] bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#1860c4] hover:shadow-[0_4px_12px_rgba(29,111,219,0.3)] hover:-translate-y-px disabled:opacity-50 disabled:transform-none";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="card">
          <div className="mb-4 text-sm font-bold text-[var(--text)]">Invoice Details</div>
          <div className="space-y-3.5">
            <div>
              <label className={labelClass}>Customer Name</label>
              <CustomerAutocomplete
                value={customerName}
                onChange={handleCustomerSelect}
                placeholder="Search or type company name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Invoice Number</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Linked Order</label>
                <select
                  value={orderRef}
                  onChange={(e) => setOrderRef(e.target.value)}
                  className={inputClass}
                >
                  <option value="">No linked order</option>
                  {orderSuggestions.map((order) => (
                    <option key={order.id} value={order.orderNumber}>
                      {order.orderNumber} | {order.tireSpec || "No spec"} | Qty {order.quantity}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Customer Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={`${inputClass} min-h-[70px] resize-y`}
              />
            </div>
            <div>
              <label className={labelClass}>Line Items</label>
              <div className="overflow-hidden rounded-[7px] border border-[var(--border2)] bg-[var(--bg)]">
                <table className="invoice-line-items w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg2)]">
                      <th className="py-2.5 pl-3 text-left font-semibold text-[var(--text-mid)]">Description</th>
                      <th className="w-20 px-2 py-2.5 text-right font-semibold text-[var(--text-mid)]">Qty</th>
                      <th className="w-28 px-2 py-2.5 text-right font-semibold text-[var(--text-mid)]">Unit Price</th>
                      <th className="w-28 pl-2 pr-3 py-2.5 text-right font-semibold text-[var(--text-mid)]">Total</th>
                      <th className="w-12 px-0 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i} className="border-b border-[var(--border)] last:border-b-0">
                        <td className="p-0 align-middle">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              const v = [...lineItems];
                              v[i] = { ...v[i], description: e.target.value };
                              setLineItems(v);
                            }}
                            className="invoice-desc-input w-full border-0 bg-transparent px-3 py-2.5 text-[13px] focus:bg-[var(--bg)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                            placeholder="Item description"
                          />
                        </td>
                        <td className="p-0 align-middle">
                          <input
                            type="number"
                            min={0}
                            value={item.quantity || ""}
                            onChange={(e) => {
                              const v = [...lineItems];
                              v[i] = { ...v[i], quantity: Number(e.target.value) || 0 };
                              setLineItems(v);
                            }}
                            className="invoice-num-input w-full border-0 bg-transparent py-2.5 pl-2 pr-1 text-right text-[13px] tabular-nums focus:bg-[var(--bg)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                          />
                        </td>
                        <td className="p-0 align-middle">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unitPrice || ""}
                            onChange={(e) => {
                              const v = [...lineItems];
                              v[i] = { ...v[i], unitPrice: Number(e.target.value) || 0 };
                              setLineItems(v);
                            }}
                            className="invoice-num-input w-full border-0 bg-transparent py-2.5 pl-2 pr-1 text-right text-[13px] tabular-nums focus:bg-[var(--bg)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                          />
                        </td>
                        <td className="px-2 py-2.5 pr-3 text-right font-medium tabular-nums text-[var(--text)] align-middle">
                          {(item.quantity * item.unitPrice).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-0 align-middle text-center">
                          <button
                            type="button"
                            onClick={() => setLineItems(lineItems.filter((_, j) => j !== i))}
                            className="inline-flex rounded p-1.5 text-[var(--text-dim)] hover:bg-[var(--accent2-light)] hover:text-[var(--accent2)]"
                            title="Remove row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  onClick={() => setLineItems([...lineItems, { description: "", quantity: 0, unitPrice: 0 }])}
                  className="flex w-full items-center justify-center gap-2 border-t border-dashed border-[var(--border2)] py-3 text-[13px] text-[var(--text-mid)] hover:bg-[var(--bg3)] hover:text-[var(--accent)]"
                >
                  <Plus className="h-4 w-4" />
                  Add line item
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Payment Terms</label>
                <select
                  value={paymentTermsVal}
                  onChange={(e) => setPaymentTermsVal(e.target.value)}
                  className={inputClass}
                >
                  {paymentTerms.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Tax Rate (%)</label>
                <input
                  type="text"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <button onClick={handleGenerate} disabled={generating} className={btnPrimary}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              Smart Draft Invoice
            </button>
          </div>
        </div>

        <div className="card">
          <div className="mb-4 text-sm font-bold text-[var(--text)]">Invoice Assistant</div>
          <div className="space-y-4">
            {matchedOrder ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 text-[13px]">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-dim)]">Matched Order</div>
                <div className="mt-2 font-semibold text-[var(--text)]">{matchedOrder.orderNumber}</div>
                <div className="mt-1 text-[var(--text-mid)]">{matchedOrder.tireSpec || "No tire spec"}</div>
                <div className="mt-2 flex gap-3 text-[12px] text-[var(--text-dim)]">
                  <span>Status: {matchedOrder.status}</span>
                  <span>Qty: {matchedOrder.quantity}</span>
                  <span>Value: {matchedOrder.value?.toLocaleString("en-US") || "—"}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 text-[13px] text-[var(--text-dim)]">
                Link a customer order to let the assistant infer the main line item, freight, and risk checks.
              </div>
            )}

            <div className="rounded-lg border border-[var(--border)] bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-dim)]">Suggested Charges</div>
              {lineItems.filter((item) => item.description.trim()).length > 0 ? (
                <div className="mt-2 space-y-2 text-[13px] text-[var(--text)]">
                  {lineItems
                    .filter((item) => item.description.trim())
                    .map((item, idx) => (
                      <div key={`${item.description}-${idx}`} className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-[var(--text)]">{item.description}</div>
                          <div className="text-[12px] text-[var(--text-dim)]">
                            Qty {item.quantity} x ${formatCurrency(item.unitPrice)}
                          </div>
                        </div>
                        <div className="font-semibold tabular-nums text-[var(--text)]">
                          ${formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="mt-2 text-[13px] text-[var(--text-dim)]">
                  No line items yet. Add items or generate a smart draft first.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-dim)]">Pricing Summary</div>
              <div className="mt-2 space-y-2 text-[13px]">
                <div className="flex items-center justify-between text-[var(--text-mid)]">
                  <span>Subtotal</span>
                  <span className="tabular-nums">${formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[var(--text-mid)]">
                  <span>Tax ({Number(taxRate) || 0}%)</span>
                  <span className="tabular-nums">${formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 font-semibold text-[var(--text)]">
                  <span>Invoice Total</span>
                  <span className="tabular-nums">${formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-dim)]">Review Notes</div>
              {assistantNotes.length > 0 ? (
                <ul className="mt-2 space-y-2 text-[13px] text-[var(--text)]">
                  {assistantNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[13px] text-[var(--text-dim)]">
                  Smart draft will add commercial notes here after checking customer and order data.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-dim)]">
                <AlertTriangle className="h-4 w-4 text-[var(--accent2)]" />
                Risk Flags
              </div>
              {assistantWarnings.length > 0 ? (
                <ul className="mt-2 space-y-2 text-[13px] text-[var(--accent2)]">
                  {assistantWarnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[13px] text-[var(--text-dim)]">
                  No warnings yet. Generate a draft to run checks for address gaps, missing order linkage, and pricing mismatch.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-dim)]">Recommended Next Step</div>
              <p className="mt-2 text-[13px] text-[var(--text)]">{recommendedNextStep}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-4 text-sm font-bold text-[var(--text)]">Invoice Preview</div>
        <div className="relative min-h-[220px] max-h-[360px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4">
          {preview ? (
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--text)]">
              {preview}
            </pre>
          ) : (
            <p className="text-center text-[var(--text-dim)]">
              Select a customer, optionally link an order, then click
              <br />
              &quot;Smart Draft Invoice&quot; to generate a business-ready invoice preview.
            </p>
          )}
        </div>
        {preview && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1860c4] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Invoice
            </button>
            <button
              onClick={() => {
                setPreview(null);
                setAssistantWarnings([]);
                setAssistantNotes([]);
                setMatchedOrder(null);
              }}
              className="inline-flex items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1860c4]"
            >
              <RotateCcw className="h-4 w-4" />
              Clear Preview
            </button>
            <button
              onClick={handleDraftEmail}
              disabled={draftingEmail}
              className="inline-flex items-center gap-2 rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-4 py-2 text-[13px] font-semibold text-[var(--text-mid)] hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] disabled:opacity-50"
            >
              {draftingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Draft Customer Email
            </button>
          </div>
        )}
        {emailDraft && (
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-white p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-dim)]">Customer Email Draft</div>
            <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--text)]">{emailDraft}</pre>
          </div>
        )}
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[var(--text)]">Recent Invoices</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-[var(--text-dim)]">Year:</span>
              {availableYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setInvoiceYear(year)}
                  className={`rounded-[6px] px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    invoiceYear === year
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "border border-[var(--border2)] bg-[var(--bg)] text-[var(--text-mid)] hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]"
                  }`}
                >
                  {year === "all" ? "All" : year}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[var(--text-dim)]" />
            <input
              type="text"
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
              placeholder="Search by invoice #, customer, order ref"
              className="max-w-xs rounded border border-[var(--border2)] px-2 py-1 text-[13px]"
            />
          </div>
        </div>
        <div className="max-h-[260px] overflow-y-auto overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-[var(--bg2)]">
              <tr className="border-b border-[var(--border2)] text-left">
                <th className="pb-2 pr-4 font-semibold text-[var(--text-mid)]">Invoice #</th>
                <th className="pb-2 pr-4 font-semibold text-[var(--text-mid)]">Customer</th>
                <th className="pb-2 pr-4 font-semibold text-[var(--text-mid)]">Order Ref</th>
                <th className="pb-2 pr-4 font-semibold text-[var(--text-mid)]">Total</th>
                <th className="pb-2 pr-4 font-semibold text-[var(--text-mid)]">Status</th>
                <th className="pb-2 font-semibold text-[var(--text-mid)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={6} className="py-4 text-center text-[var(--text-dim)]">No invoices yet.</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[var(--border2)]">
                    <td className="py-2 pr-4">
                      <button
                        type="button"
                        onClick={() => setPreviewModal(inv)}
                        className="font-medium text-[var(--accent)] hover:underline text-left"
                      >
                        {inv.invoiceNumber}
                      </button>
                    </td>
                    <td className="py-2 pr-4">{inv.customerName}</td>
                    <td className="py-2 pr-4">{inv.orderRef || "—"}</td>
                    <td className="py-2 pr-4 tabular-nums">
                      {calcInvoiceTotal(inv) > 0 ? `$${formatCurrency(calcInvoiceTotal(inv))}` : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {inv.status === "PAID" ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                          ✓ Paid
                        </span>
                      ) : (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1.5">
                        {inv.status !== "PAID" && inv.id !== "pending" && (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(inv.id)}
                            disabled={markingPaid === inv.id}
                            className="rounded-[5px] border border-green-300 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50 whitespace-nowrap"
                          >
                            {markingPaid === inv.id ? "..." : "Mark Paid"}
                          </button>
                        )}
                        {inv.id !== "pending" && (
                          <button
                            type="button"
                            onClick={() => handleSendInvoiceEmail(inv)}
                            disabled={sendingEmail === inv.id}
                            className="rounded-[5px] border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 whitespace-nowrap disabled:opacity-50"
                          >
                            {sendingEmail === inv.id ? "..." : "✉ Send Invoice"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px] text-[var(--text-dim)]">
          <span>Showing {(invoicePage - 1) * invoicePageSize + (invoices.length ? 1 : 0)}-{(invoicePage - 1) * invoicePageSize + invoices.length} of {invoiceTotal}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
              disabled={invoicePage === 1}
              className="rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setInvoicePage((p) => p + 1)}
              disabled={invoicePage * invoicePageSize >= invoiceTotal}
              className="rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {previewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setPreviewModal(null)}
        >
          <div
            className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg3)] px-4 py-3">
              <h3 className="text-sm font-bold text-[var(--text)]">
                Invoice {previewModal.invoiceNumber}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewModal(null)}
                className="rounded p-2 text-[var(--text-dim)] hover:bg-[var(--bg2)] hover:text-[var(--text)]"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {previewModal.preview ? (
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--text)]">
                  {previewModal.preview}
                </pre>
              ) : (
                <p className="text-[var(--text-dim)]">No preview available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoiceAIPage() {
  return (
    <Suspense
      fallback={
        <div className="card flex min-h-[240px] items-center justify-center text-[var(--text-dim)]">
          Loading invoice workspace...
        </div>
      }
    >
      <InvoiceAIContent />
    </Suspense>
  );
}
