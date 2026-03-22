"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { safeJson } from "@/lib/safe-json";
import Link from "next/link";
import { CustomerAutocomplete, type Customer } from "@/components/CustomerAutocomplete";

type QuoteRow = {
  id: string;
  customerName: string | null;
  category: string | null;
  size: string;
  quantity: number | null;
  customerId?: string | null;
  createdAt: string;
};
type SalesAssistant = {
  customerType: string;
  opportunityLevel: "High" | "Medium" | "Low";
  recommendedQuote: {
    estimatedUnitPrice: number;
    estimatedTotal: number | null;
    leadTime: string;
    paymentTerms: string;
  };
  historicalReference: {
    customerOrders: number;
    recentQuotes: number;
    avgHistoricalUnitPrice: number | null;
    lastOrderDate: string | null;
  };
  similarWonQuotes: Array<{
    id: string;
    customerName: string;
    tireSpec: string;
    quantity: number;
    unitPrice: number | null;
    outcome: string;
    createdAt: string;
  }>;
  riskFlags: string[];
  suggestedSalesAction: string;
  winProbability: {
    score: number;
    band: "High" | "Medium" | "Low";
  };
  negotiationAngle: string;
};

function formatMoney(value: number | null) {
  if (value == null) return "Pending";
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function withSalesAssistantDefaults(salesAssistant: SalesAssistant | null): SalesAssistant | null {
  if (!salesAssistant) return null;
  return {
    ...salesAssistant,
    winProbability: salesAssistant.winProbability ?? { score: 0, band: "Low" },
    similarWonQuotes: salesAssistant.similarWonQuotes ?? [],
    negotiationAngle:
      salesAssistant.negotiationAngle ||
      "Use the current quote as a starting point, then confirm price sensitivity, lead time, and any compliance requirements with the customer.",
  };
}

export default function AIQuotingPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("225/65R17");
  const [loadIndex, setLoadIndex] = useState("95");
  const [speedRating, setSpeedRating] = useState("H (210 km/h)");
  const [quantity, setQuantity] = useState("");
  const [compound, setCompound] = useState("Standard — SBR Blend");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [salesAssistant, setSalesAssistant] = useState<SalesAssistant | null>(null);
  const [lastCreatedQuoteId, setLastCreatedQuoteId] = useState<string | null>(null);
  const [lastCreatedOrderId, setLastCreatedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [quoteSearch, setQuoteSearch] = useState("");
  const [quotePage, setQuotePage] = useState(1);
  const [quoteTotal, setQuoteTotal] = useState(0);
  const [quoteYear, setQuoteYear] = useState("all");
  const quotePageSize = 20;
  const availableYears = ["all", "2026", "2025", "2024", "2023", "2022", "2021"];

  const loadQuotes = async () => {
    const params = new URLSearchParams({
      page: String(quotePage),
      pageSize: String(quotePageSize),
    });
    if (quoteSearch) params.set("q", quoteSearch);
    if (quoteYear !== "all") params.set("year", quoteYear);
    const res = await fetch(`/api/quotes?${params.toString()}`);
    const data = await safeJson<{ quotes?: QuoteRow[]; total?: number }>(res);
    setQuotes(data.quotes || []);
    setQuoteTotal(data.total || 0);
  };
  useEffect(() => {
    loadQuotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteSearch, quotePage, quoteYear]);

  useEffect(() => {
    setQuotePage(1);
  }, [quoteSearch, quoteYear]);

  const handleQuote = async () => {
    if (!category || !size) {
      alert("Please fill in Tire Category and Tire Size.");
      return;
    }
    setLoading(true);
    setResult(null);
    setSalesAssistant(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          category,
          size,
          loadIndex,
          speedRating,
          quantity,
          compound,
          notes,
          customerId: selectedCustomer?.id,
        }),
      });
      const data = await safeJson<{
        result?: string;
        error?: string;
        salesAssistant?: SalesAssistant;
        createdQuoteId?: string | null;
        createdQuoteSummary?: QuoteRow | null;
      }>(res);
      setResult(data.result || data.error || "Failed");
      setSalesAssistant(withSalesAssistantDefaults(data.salesAssistant || null));
      setLastCreatedQuoteId(data.createdQuoteId || null);
      if (data.createdQuoteSummary) {
        setQuotePage(1);
        setQuotes((current) => {
          const next = [data.createdQuoteSummary!, ...current.filter((quote) => quote.id !== data.createdQuoteSummary!.id)];
          return next.slice(0, quotePageSize);
        });
        setQuoteTotal((current) => current + 1);
      } else {
        loadQuotes();
      }
    } catch {
      setResult("API failed. Ensure OPENAI_API_KEY is configured.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "form-input w-full rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-2.5 text-[13.5px] text-[var(--text)] placeholder-[var(--text-light)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(29,111,219,0.12)] focus:outline-none";
  const labelClass = "form-label mb-1.5 block text-xs font-semibold text-[var(--text-mid)]";
  const btnPrimary =
    "inline-flex items-center gap-2 rounded-[7px] bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#1860c4] hover:shadow-[0_4px_12px_rgba(29,111,219,0.3)] hover:-translate-y-px disabled:opacity-50 disabled:transform-none";
  const btnSecondary =
    "rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-4 py-2 text-[13px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]";
  const resolvedSalesAssistant = withSalesAssistantDefaults(salesAssistant);
  const invoiceParams = new URLSearchParams();
  if (selectedCustomer?.id) invoiceParams.set("customerId", selectedCustomer.id);
  if (customer.trim()) invoiceParams.set("customer", customer.trim());
  if (size.trim()) invoiceParams.set("tireSpec", `${size}${category ? ` · ${category}` : ""}`);
  if (quantity) invoiceParams.set("quantity", quantity);
  if (resolvedSalesAssistant?.recommendedQuote.estimatedTotal != null) {
    invoiceParams.set("value", String(resolvedSalesAssistant.recommendedQuote.estimatedTotal));
  }
  const invoiceHref = invoiceParams.toString() ? `/invoice?${invoiceParams.toString()}` : "/invoice";
  const applyHistoricalQuote = (quote: QuoteRow) => {
    setCustomer(quote.customerName || "");
    setSelectedCustomer((current) =>
      current && current.id === quote.customerId
        ? current
        : quote.customerId
          ? { id: quote.customerId, name: quote.customerName || "", company: quote.customerName || "", email: null, phone: null, address: null, createdAt: "" }
          : null
    );
    setCategory(quote.category || "");
    setSize(quote.size || "");
    setQuantity(quote.quantity ? String(quote.quantity) : "");
  };
  const buildOrderNumber = () => `T0-${Date.now().toString().slice(-6)}`;
  const handleConvertToOrder = async () => {
    if (!customer.trim() || !size.trim() || !quantity) {
      alert("Customer, tire size, and quantity are required before converting to an order.");
      return;
    }
    setConverting(true);
    try {
      const tireSpec = `${size}${category ? ` · ${category}` : ""}`;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: buildOrderNumber(),
          customerId: selectedCustomer?.id,
          customerName: customer.trim(),
          tireSpec,
          quantity: Number(quantity),
          value: resolvedSalesAssistant?.recommendedQuote.estimatedTotal ?? undefined,
        }),
      });
      const data = await safeJson<{
        order?: {
          id: string;
          orderNumber: string;
          customerName: string | null;
          tireSpec: string | null;
          quantity: number;
          value: number | null;
          createdAt: string;
        };
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to create order");
      setLastCreatedOrderId(data.order?.id || null);
      const order = data.order;
      if (order) {
        const params = new URLSearchParams({
          newOrderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName || "",
          tireSpec: order.tireSpec || "",
          quantity: String(order.quantity),
          value: String(order.value ?? ""),
          createdAt: order.createdAt,
        });
        router.push(`/orders?${params.toString()}`);
        return;
      }
      alert("Order created successfully. You can now manage it from Orders.");
    } catch (error) {
      alert(String(error));
    } finally {
      setConverting(false);
    }
  };
  const clearQuoteForm = () => {
    setCustomer("");
    setSelectedCustomer(null);
    setCategory("");
    setSize("225/65R17");
    setLoadIndex("95");
    setSpeedRating("H (210 km/h)");
    setQuantity("");
    setCompound("Standard — SBR Blend");
    setNotes("");
    setResult(null);
    setSalesAssistant(null);
    setLastCreatedQuoteId(null);
  };

  return (
    <div className="grid gap-4 grid-cols-2">
      <div className="card">
        <div className="mb-4 text-sm font-bold text-[var(--text)]">Tire Order Specification</div>
        <div className="space-y-3.5">
          <div>
            <label className={labelClass}>Customer / Fleet Name</label>
            <CustomerAutocomplete
              value={customer}
              onChange={(v, c) => {
                setCustomer(v);
                setSelectedCustomer(c ?? null);
              }}
              placeholder="e.g. Fleet Solutions Ltd, ABC Logistics"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tire Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                <option value="">Select category...</option>
                <option>Passenger Car (PCR)</option>
                <option>SUV / Light Truck (LT)</option>
                <option>Commercial Truck (TBR)</option>
                <option>Off-The-Road (OTR)</option>
                <option>Ultra High Performance (UHP)</option>
                <option>Winter / All-Season</option>
                <option>Agricultural / Industrial</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Tire Size</label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className={inputClass}
                placeholder="e.g. 225/65R17"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Load Index</label>
              <input
                type="text"
                value={loadIndex}
                onChange={(e) => setLoadIndex(e.target.value)}
                className={inputClass}
                placeholder="e.g. 95, 116 XL"
              />
            </div>
            <div>
              <label className={labelClass}>Speed Rating</label>
              <select
                value={speedRating}
                onChange={(e) => setSpeedRating(e.target.value)}
                className={inputClass}
              >
                <option>H (210 km/h)</option>
                <option>V (240 km/h)</option>
                <option>W (270 km/h)</option>
                <option>Y (300 km/h)</option>
                <option>T (190 km/h)</option>
                <option>S (180 km/h)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Quantity (units)</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputClass}
                placeholder="e.g. 500"
              />
            </div>
            <div>
              <label className={labelClass}>Compound / Grade</label>
              <select
                value={compound}
                onChange={(e) => setCompound(e.target.value)}
                className={inputClass}
              >
                <option>Standard — SBR Blend</option>
                <option>Premium — NR/SBR High-Silica</option>
                <option>Economy — Carbon Black</option>
                <option>Winter — Low-Temp SBR</option>
                <option>OTR — Thick Wall Compound</option>
                <option>Racing — Soft Slick</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Special Requirements / OEM Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} min-h-[90px] resize-y`}
              placeholder="e.g. DOT/ECE certification required, run-flat construction, custom sidewall branding, delivery schedule..."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleQuote} disabled={loading} className={btnPrimary}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating quote...
                </>
              ) : (
                "Generate AI Quote"
              )}
            </button>
            <button type="button" onClick={clearQuoteForm} className={btnSecondary}>
              Clear
            </button>
          </div>
          {result && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Quote Draft</div>
              <div className="h-[420px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-white px-4 py-3 font-mono text-[13px] leading-7 text-[var(--text)]">
                {result}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="card">
        <div className="mb-4 text-sm font-bold text-[var(--text)]">Sales Quote Assistant</div>
        {loading ? (
          <div className="flex min-h-[460px] items-center gap-1.5 text-[var(--accent)]">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:0.4s]" />
            &nbsp; Building sales recommendation...
          </div>
        ) : result && resolvedSalesAssistant ? (
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Recommended Quote</div>
                <div className="mt-3 space-y-2 text-[13px] text-[var(--text)]">
                  <div className="flex items-center justify-between gap-3">
                    <span>Unit Price</span>
                    <span className="font-semibold">{formatMoney(resolvedSalesAssistant.recommendedQuote.estimatedUnitPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Estimated Total</span>
                    <span className="font-semibold">{formatMoney(resolvedSalesAssistant.recommendedQuote.estimatedTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Lead Time</span>
                    <span className="font-semibold">{resolvedSalesAssistant.recommendedQuote.leadTime}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Payment Terms</span>
                    <span className="font-semibold">{resolvedSalesAssistant.recommendedQuote.paymentTerms}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Sales Positioning</div>
                <div className="mt-3 space-y-3 text-[13px] text-[var(--text)]">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--text-light)]">Customer Type</div>
                    <div className="mt-1 font-semibold">{resolvedSalesAssistant.customerType}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--text-light)]">Opportunity Level</div>
                    <div className="mt-1 font-semibold">{resolvedSalesAssistant.opportunityLevel}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--text-light)]">Win Probability</div>
                    <div className="mt-1 font-semibold">
                      {resolvedSalesAssistant.winProbability.band} ({resolvedSalesAssistant.winProbability.score}%)
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--text-light)]">Suggested Sales Action</div>
                    <div className="mt-1 leading-6 text-[var(--text-mid)]">{resolvedSalesAssistant.suggestedSalesAction}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Historical Reference</div>
                <div className="mt-3 space-y-2 text-[13px] text-[var(--text)]">
                  <div className="flex items-center justify-between gap-3">
                    <span>Customer Orders</span>
                    <span className="font-semibold">{resolvedSalesAssistant.historicalReference.customerOrders}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Recent Quotes</span>
                    <span className="font-semibold">{resolvedSalesAssistant.historicalReference.recentQuotes}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Avg Historical Unit Price</span>
                    <span className="font-semibold">{formatMoney(resolvedSalesAssistant.historicalReference.avgHistoricalUnitPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Last Order</span>
                    <span className="font-semibold">
                      {resolvedSalesAssistant.historicalReference.lastOrderDate
                        ? new Date(resolvedSalesAssistant.historicalReference.lastOrderDate).toLocaleDateString()
                        : "No history"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Risk Flags</div>
                <div className="mt-3 space-y-2 text-[13px] text-[var(--text)]">
                  {resolvedSalesAssistant.riskFlags.length > 0 ? (
                    resolvedSalesAssistant.riskFlags.map((flag) => (
                      <div key={flag} className="rounded-lg border border-[var(--border2)] bg-white px-3 py-2">
                        {flag}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-[var(--border2)] bg-white px-3 py-2">
                      No major pricing or fulfillment risks detected from current inputs.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Negotiation Angle</div>
              <div className="mt-3 text-[13px] leading-6 text-[var(--text)]">{resolvedSalesAssistant.negotiationAngle}</div>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Similar Won Quotes</div>
              <div className="mt-3 max-h-[240px] space-y-2 overflow-y-auto pr-1">
                {resolvedSalesAssistant.similarWonQuotes.length > 0 ? (
                  resolvedSalesAssistant.similarWonQuotes.map((wonQuote) => (
                    <div key={wonQuote.id} className="rounded-lg border border-[var(--border2)] bg-white px-3 py-2 text-[13px] text-[var(--text)]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{wonQuote.customerName}</span>
                        <span className="text-[var(--text-dim)]">{wonQuote.outcome}</span>
                      </div>
                      <div className="mt-1 text-[var(--text-mid)]">{wonQuote.tireSpec}</div>
                      <div className="mt-1 text-[12px] text-[var(--text-dim)]">
                        Qty {wonQuote.quantity.toLocaleString()}
                        {wonQuote.unitPrice != null ? ` · Approx. $${wonQuote.unitPrice}/unit` : ""}
                        {` · ${new Date(wonQuote.createdAt).toLocaleDateString()}`}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-[var(--border2)] bg-white px-3 py-2 text-[13px] text-[var(--text-dim)]">
                    No similar won history found for this spec yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-[220px] rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-4 py-3 text-[14px] leading-8 text-[var(--text-dim)]">
            Fill the specification form and click &ldquo;Generate AI Quote&rdquo; to receive a structured sales recommendation, pricing draft, and risk review.
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => result && navigator.clipboard.writeText(result)}
            className={btnSecondary}
          >
            Copy
          </button>
          <button
            type="button"
            onClick={handleConvertToOrder}
            disabled={!result || converting}
            className={btnSecondary}
          >
            {converting ? "Converting..." : "Convert to Order"}
          </button>
          <Link href={invoiceHref} className={btnSecondary}>
            Create Invoice →
          </Link>
        </div>
        {lastCreatedOrderId && (
          <div className="mt-3 text-[12px] text-[var(--text-dim)]">
            Order created. Continue in <Link href="/orders" className="font-semibold text-[var(--accent)]">Orders</Link>.
          </div>
        )}
      </div>
      <div className="card col-span-full">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-sm font-bold text-[var(--text)]">Historical Quote Reference</span>
              <div className="mt-1 text-[12px] text-[var(--text-dim)]">Reuse a past quote as a starting point for a new one.</div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-[var(--text-dim)]">Year:</span>
              {availableYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setQuoteYear(year)}
                  className={`rounded-[6px] px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    quoteYear === year
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
              value={quoteSearch}
              onChange={(e) => setQuoteSearch(e.target.value)}
              placeholder="Search by customer, category, size"
              className="max-w-xs rounded border border-[var(--border2)] px-2 py-1 text-[13px]"
            />
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto overflow-x-auto">
          <table className="w-full table-fixed text-[13px]">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[32%]" />
              <col className="w-[14%]" />
              <col className="w-[8%]" />
              <col className="w-[14%]" />
              <col className="w-[80px]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-[var(--bg2)]">
              <tr className="border-b border-[var(--border2)] text-left">
                <th className="pb-2 pr-4 font-semibold text-[var(--text-mid)]">Customer</th>
                <th className="pb-2 pr-4 font-semibold text-[var(--text-mid)]">Category</th>
                <th className="pb-2 pr-4 font-semibold text-[var(--text-mid)]">Size</th>
                <th className="pb-2 pr-4 font-semibold text-[var(--text-mid)]">Qty</th>
                <th className="pb-2 font-semibold text-[var(--text-mid)]">Date</th>
                <th className="pb-2 pl-2 font-semibold text-[var(--text-mid)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr><td colSpan={6} className="py-4 text-center text-[var(--text-dim)]">No quote history yet.</td></tr>
              ) : (
                quotes.map((q) => (
                  <tr key={q.id} className="border-b border-[var(--border2)]">
                    <td className="py-2 pr-4 align-top">
                      <div className="flex items-center gap-2">
                        <span>{q.customerName || "—"}</span>
                        {lastCreatedQuoteId === q.id && (
                          <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--accent)]">
                            New
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-4 align-top">{q.category || "—"}</td>
                    <td className="py-2 pr-4 align-top">{q.size}</td>
                    <td className="py-2 pr-4">{q.quantity?.toLocaleString() || "—"}</td>
                    <td className="py-2">{new Date(q.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 pl-2">
                      <button type="button" onClick={() => applyHistoricalQuote(q)} className="rounded-[6px] border border-[var(--border2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-light)]">
                        Reuse
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px] text-[var(--text-dim)]">
          <span>Showing {(quotePage - 1) * quotePageSize + (quotes.length ? 1 : 0)}-{(quotePage - 1) * quotePageSize + quotes.length} of {quoteTotal}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setQuotePage((p) => Math.max(1, p - 1))} disabled={quotePage === 1} className={btnSecondary}>
              Previous
            </button>
            <button type="button" onClick={() => setQuotePage((p) => p + 1)} disabled={quotePage * quotePageSize >= quoteTotal} className={btnSecondary}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
