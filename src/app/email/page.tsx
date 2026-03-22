"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search } from "lucide-react";
import { safeJson } from "@/lib/safe-json";

type CustomerOption = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
};

type QuoteOption = {
  id: string;
  customerName: string | null;
  category: string | null;
  size: string;
  quantity: number | null;
  createdAt: string;
  customerId: string | null;
};

type OrderOption = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  tireSpec: string | null;
  quantity: number;
  value: number | null;
  createdAt: string;
};

type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  orderRef: string | null;
  paymentTerms: string;
  createdAt: string;
};

type EmailAssistantResponse = {
  result?: string;
  subject?: string;
  body?: string;
  goal?: string;
  followUp?: string;
  sendTiming?: string;
  contextSummary?: string;
  error?: string;
};

type DraftHistoryRow = {
  id: string;
  inquiryType: string;
  createdAt: string;
  result: string | null;
};

const scenarios = [
  "Quote Follow-up",
  "Invoice Delivery",
  "Reorder Reminder",
  "Delay Notice",
  "Customer Inquiry Reply",
] as const;

const tones = [
  "Professional & technical",
  "Friendly & casual",
  "Formal & corporate",
  "Concise & direct",
];

const LATEST_EMAIL_DRAFT_STORAGE_KEY = "tireops_latest_email_draft";

export default function EmailAIPage() {
  const [scenario, setScenario] = useState<(typeof scenarios)[number]>(scenarios[0]);
  const [tone, setTone] = useState(tones[0]);
  const [notes, setNotes] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [result, setResult] = useState<EmailAssistantResponse | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [drafts, setDrafts] = useState<DraftHistoryRow[]>([]);
  const [draftSearch, setDraftSearch] = useState("");
  const [draftPage, setDraftPage] = useState(1);
  const [draftTotal, setDraftTotal] = useState(0);
  const [draftYear, setDraftYear] = useState("all");
  const [draftSortOrder, setDraftSortOrder] = useState<"default" | "newest" | "oldest">("default");
  const [pinnedDraft, setPinnedDraft] = useState<DraftHistoryRow | null>(null);
  const [previewDraft, setPreviewDraft] = useState<DraftHistoryRow | null>(null);
  const draftPageSize = 20;
  const availableYears = ["all", "2026", "2025", "2024", "2023", "2022", "2021"];

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || null;

  const loadDrafts = async () => {
    const params = new URLSearchParams({
      page: String(draftPage),
      pageSize: String(draftPageSize),
    });
    if (draftSearch) params.set("q", draftSearch);
    if (draftYear !== "all") params.set("year", draftYear);
    if (draftSortOrder !== "default") params.set("sort", draftSortOrder);
    const res = await fetch(`/api/email-drafts?${params.toString()}`);
    const data = await safeJson<{ drafts?: DraftHistoryRow[]; total?: number }>(res);
    setDrafts((currentDrafts) => {
      const incoming = data.drafts || [];
      if (draftSortOrder !== "default") return incoming;
      if (draftPage !== 1 || draftSearch || draftYear !== "all") return incoming;

      const incomingIds = new Set(incoming.map((draft) => draft.id));
      const preserved = currentDrafts.filter((draft) => !incomingIds.has(draft.id));
      return [...incoming, ...preserved];
    });
    setDraftTotal(data.total || 0);
  };

  const loadCustomers = async () => {
    const res = await fetch("/api/customers");
    const data = await safeJson<{ customers?: CustomerOption[] }>(res);
    const list = data.customers || [];
    setCustomers(list);
    if (!selectedCustomerId && list[0]) setSelectedCustomerId(list[0].id);
  };

  const loadContext = async (customerId: string) => {
    if (!customerId) {
      setQuotes([]);
      setOrders([]);
      setInvoices([]);
      return;
    }
    const [quoteRes, orderRes, invoiceRes] = await Promise.all([
      fetch(`/api/quotes?customerId=${customerId}&pageSize=12`),
      fetch(`/api/orders?customerId=${customerId}&pageSize=12&sort=newest`),
      fetch(`/api/invoices?customerId=${customerId}&pageSize=12`),
    ]);
    const [quoteData, orderData, invoiceData] = await Promise.all([
      safeJson<{ quotes?: QuoteOption[] }>(quoteRes),
      safeJson<{ orders?: OrderOption[] }>(orderRes),
      safeJson<{ invoices?: InvoiceOption[] }>(invoiceRes),
    ]);
    setQuotes(quoteData.quotes || []);
    setOrders(orderData.orders || []);
    setInvoices(invoiceData.invoices || []);
  };

  useEffect(() => {
    loadCustomers();
    loadDrafts();
    const saved = window.localStorage.getItem(LATEST_EMAIL_DRAFT_STORAGE_KEY);
    if (!saved) return;
    try {
      setPinnedDraft(JSON.parse(saved) as DraftHistoryRow);
    } catch {
      window.localStorage.removeItem(LATEST_EMAIL_DRAFT_STORAGE_KEY);
    }
    // bootstrap only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDrafts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSearch, draftPage, draftYear, draftSortOrder]);

  useEffect(() => {
    setDraftPage(1);
  }, [draftSearch, draftYear, draftSortOrder]);

  useEffect(() => {
    loadContext(selectedCustomerId);
    setSelectedQuoteId("");
    setSelectedOrderId("");
    setSelectedInvoiceId("");
  }, [selectedCustomerId]);

  const handleDraft = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          tone,
          customerId: selectedCustomerId || undefined,
          customerName: selectedCustomer?.company || selectedCustomer?.name || undefined,
          quoteId: selectedQuoteId || undefined,
          orderId: selectedOrderId || undefined,
          invoiceId: selectedInvoiceId || undefined,
          notes,
        }),
      });
      const data = await safeJson<EmailAssistantResponse>(res);
      setResult(data);
      setDraftSubject(data.subject || "");
      setDraftBody(data.body || "");
    } catch {
      setResult({ error: "Failed to generate draft." });
      setDraftSubject("");
      setDraftBody("");
    } finally {
      setLoading(false);
    }
  };

  const clearComposer = () => {
    setScenario(scenarios[0]);
    setTone(tones[0]);
    setNotes("");
    setSelectedQuoteId("");
    setSelectedOrderId("");
    setSelectedInvoiceId("");
    setResult(null);
    setDraftSubject("");
    setDraftBody("");
  };

  const handleSaveDraft = async () => {
    const composed = draftSubject.trim()
      ? `Subject: ${draftSubject}\n\n${draftBody}`
      : draftBody.trim();
    if (!composed) return;

    setSavingDraft(true);
    try {
      const res = await fetch("/api/email-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryType: `${scenario} (Edited)`,
          emailText: notes,
          tone,
          result: composed,
        }),
      });
      const data = await safeJson<{ error?: string; draft?: DraftHistoryRow }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to save draft");
      }
      if (data.draft) {
        setPinnedDraft(data.draft);
        window.localStorage.setItem(LATEST_EMAIL_DRAFT_STORAGE_KEY, JSON.stringify(data.draft));
        setDrafts((currentDrafts) => [data.draft as DraftHistoryRow, ...currentDrafts.filter((draft) => draft.id !== data.draft?.id)]);
        setDraftTotal((total) => total + 1);
      }
      if (draftSortOrder !== "default" || draftPage !== 1 || draftSearch || draftYear !== "all") {
        loadDrafts();
      }
    } catch (error) {
      alert(String(error));
    } finally {
      setSavingDraft(false);
    }
  };

  const inputClass =
    "form-input w-full rounded-[9px] border border-[var(--border2)] bg-[rgba(255,255,255,0.84)] px-3 py-2.5 text-[13.5px] text-[var(--text)] placeholder-[var(--text-light)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(29,111,219,0.12)] focus:outline-none";
  const labelClass = "mb-1.5 block text-xs font-semibold text-[var(--text-mid)]";
  const btnPrimary =
    "inline-flex items-center gap-2 rounded-[9px] bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[#1860c4]";
  const btnSecondary =
    "rounded-[9px] border border-[var(--border2)] bg-[rgba(255,255,255,0.84)] px-4 py-2 text-[13px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]";
  const displayedDrafts = (() => {
    const combined = pinnedDraft
      ? [pinnedDraft, ...drafts.filter((draft) => draft.id !== pinnedDraft.id)]
      : drafts;
    const seen = new Set<string>();
    return combined.filter((draft) => {
      if (seen.has(draft.id)) return false;
      seen.add(draft.id);
      return true;
    });
  })();

  return (
    <div className="page-shell grid gap-4 grid-cols-[minmax(380px,0.9fr)_minmax(0,1.1fr)]">
      <div className="card panel-strong">
        <div className="mb-4">
          <div className="text-sm font-bold text-[var(--text)]">Email Workflow Setup</div>
          <div className="mt-1 text-[12px] text-[var(--text-dim)]">
            Build a customer-facing draft using quote, order, or invoice context.
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Email Scenario</label>
            <select value={scenario} onChange={(e) => setScenario(e.target.value as (typeof scenarios)[number])} className={inputClass}>
              {scenarios.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Customer</label>
            <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className={inputClass}>
              <option value="">Select customer...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.company || customer.name || "Unnamed customer"}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 grid-cols-3">
            <div>
              <label className={labelClass}>Reference Quote</label>
              <select value={selectedQuoteId} onChange={(e) => setSelectedQuoteId(e.target.value)} className={inputClass}>
                <option value="">Optional</option>
                {quotes.map((quote) => (
                  <option key={quote.id} value={quote.id}>
                    {quote.size} · {quote.quantity || 0}u
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Reference Order</label>
              <select value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)} className={inputClass}>
                <option value="">Optional</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber} · {order.quantity}u
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Reference Invoice</label>
              <select value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)} className={inputClass}>
                <option value="">Optional</option>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)} className={inputClass}>
              {tones.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Internal Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} min-h-[150px] resize-y`}
              placeholder="Add delivery notes, payment reminders, delay details, or customer-specific instructions..."
            />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 text-[12px] text-[var(--text-mid)]">
            <div className="font-semibold text-[var(--text)]">Loaded business context</div>
            <div className="mt-1">
              {selectedCustomer
                ? `${selectedCustomer.company || selectedCustomer.name}${selectedCustomer.email ? ` · ${selectedCustomer.email}` : ""}`
                : "Select a customer to load recent quotes, orders, and invoices."}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDraft} disabled={loading} className={btnPrimary}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Drafting email...
                </>
              ) : (
                "Draft Email"
              )}
            </button>
            <button type="button" onClick={clearComposer} className={btnSecondary}>
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="card panel-strong">
        <div className="mb-4">
          <div className="text-sm font-bold text-[var(--text)]">Email Assistant Output</div>
          <div className="mt-1 text-[12px] text-[var(--text-dim)]">
            Subject, send guidance, and a ready-to-send customer email draft.
          </div>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-3 grid-cols-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Email Goal</div>
              <div className="mt-2 text-[13px] text-[var(--text)]">{result?.goal || "Choose a scenario to set the email objective."}</div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Send Timing</div>
              <div className="mt-2 text-[13px] text-[var(--text)]">{result?.sendTiming || "No timing recommendation yet."}</div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Follow-up</div>
              <div className="mt-2 text-[13px] text-[var(--text)]">{result?.followUp || "No follow-up recommendation yet."}</div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-white p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Suggested Subject</div>
            <input
              type="text"
              value={draftSubject}
              onChange={(e) => setDraftSubject(e.target.value)}
              className={`${inputClass} mt-2 text-[14px] font-semibold`}
              placeholder="No subject generated yet."
            />
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-white p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Email Draft</div>
            <textarea
              value={loading ? "Drafting email..." : draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              readOnly={loading}
              className="min-h-[420px] w-full resize-y rounded-xl border border-[var(--border)] bg-[rgba(234,240,247,0.62)] p-4 font-mono text-[13px] leading-7 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(29,111,219,0.12)]"
              placeholder="Select a customer and scenario, then click Draft Email."
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const composed = draftSubject.trim()
                    ? `Subject: ${draftSubject}\n\n${draftBody}`
                    : draftBody;
                  if (composed) navigator.clipboard.writeText(composed);
                }}
                className={btnSecondary}
              >
                Copy
              </button>
              <button type="button" onClick={handleSaveDraft} disabled={savingDraft || !draftBody.trim()} className={btnSecondary}>
                {savingDraft ? "Saving..." : "Save Draft"}
              </button>
              <button type="button" onClick={() => setResult(null)} className={btnSecondary}>
                Clear Output
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card panel-strong col-span-full">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[var(--text)]">Email Draft History</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-[var(--text-dim)]">Year:</span>
              {availableYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setDraftYear(year)}
                  className={`rounded-[6px] px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    draftYear === year
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "border border-[var(--border2)] bg-[var(--bg)] text-[var(--text-mid)] hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]"
                  }`}
                >
                  {year === "all" ? "All" : year}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-[var(--text-dim)]">Sort:</span>
              {[
                { value: "newest", label: "Newest" },
                { value: "default", label: "Default" },
                { value: "oldest", label: "Oldest" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setDraftSortOrder(item.value as "default" | "newest" | "oldest")}
                  className={`rounded-[6px] px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    draftSortOrder === item.value
                      ? "bg-[var(--bg3)] text-[var(--text)] shadow-sm"
                      : "text-[var(--text-dim)] hover:text-[var(--text-mid)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[var(--text-dim)]" />
            <input
              type="text"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              placeholder="Search scenario or email content"
              className="max-w-xs rounded border border-[var(--border2)] bg-[rgba(255,255,255,0.84)] px-2 py-1 text-[13px]"
            />
          </div>
        </div>
        <div className="max-h-[260px] overflow-y-auto overflow-x-auto">
          <table className="table-demo w-full">
            <thead className="sticky top-0 z-10 bg-[var(--bg2)]">
              <tr>
                <th>Scenario</th>
                <th>Preview</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedDrafts.length === 0 ? (
                <tr><td colSpan={4} className="py-4 text-center text-[var(--text-dim)]">No drafts yet.</td></tr>
              ) : (
                displayedDrafts.map((draft) => (
                  <tr key={draft.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{draft.inquiryType}</span>
                        {pinnedDraft?.id === draft.id && (
                          <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                            New
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[340px] truncate text-[var(--text-dim)]">
                      {draft.result ? draft.result.slice(0, 92) + "…" : "—"}
                    </td>
                    <td>{new Date(draft.createdAt).toLocaleDateString("en-US")}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setPreviewDraft(draft)}
                        className="text-[13px] font-medium text-[var(--accent)] hover:underline"
                      >
                        Load
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px] text-[var(--text-dim)]">
          <span>
            Showing {(draftPage - 1) * draftPageSize + (drafts.length ? 1 : 0)}-{(draftPage - 1) * draftPageSize + drafts.length} of {draftTotal}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDraftPage((page) => Math.max(1, page - 1))} disabled={draftPage === 1} className={btnSecondary}>
              Previous
            </button>
            <button type="button" onClick={() => setDraftPage((page) => page + 1)} disabled={draftPage * draftPageSize >= draftTotal} className={btnSecondary}>
              Next
            </button>
          </div>
        </div>
      </div>

      {previewDraft && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={() => setPreviewDraft(null)}
        >
          <div
            className="w-full max-w-3xl rounded-[18px] border border-[var(--border)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-4">
              <div>
                <div className="text-lg font-bold text-[var(--text)]">{previewDraft.inquiryType}</div>
                <div className="mt-1 text-[12px] text-[var(--text-dim)]">
                  Saved on {new Date(previewDraft.createdAt).toLocaleDateString("en-US")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDraft(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border2)] text-[var(--text-mid)] hover:bg-[var(--bg3)]"
                aria-label="Close draft preview"
              >
                ×
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto px-6 py-5">
              <div className="whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[rgba(234,240,247,0.62)] p-4 font-mono text-[13px] leading-7 text-[var(--text)]">
                {previewDraft.result || "No draft content available."}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
              <button
                type="button"
                onClick={() => previewDraft.result && navigator.clipboard.writeText(previewDraft.result)}
                className={btnSecondary}
              >
                Copy
              </button>
              <button type="button" onClick={() => setPreviewDraft(null)} className={btnSecondary}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
