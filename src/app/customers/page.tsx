"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { safeJson } from "@/lib/safe-json";

type Customer = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
};

type IntelligenceResponse = {
  customer: {
    id: string;
    name: string | null;
    company: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  summary: {
    totalOrders: number;
    totalInvoices: number;
    totalQuotes: number;
    totalUnits: number;
    totalOrderValue: number;
    avgOrderValue: number;
    activeSpecs: number;
    avgDaysBetweenOrders: number | null;
    recentOrderDate: string | null;
    predictedReorderDate: string | null;
    cadenceLabel: string;
  };
  topSpecs: { spec: string; orders: number; units: number; revenue: number }[];
  familyMix: { family: string; units: number; revenue: number }[];
  monthlyTrend: { month: string; orders: number; units: number; revenue: number }[];
  demandSignals: string[];
  reorderGuidance: {
    expectedWindowStart: string | null;
    expectedWindowEnd: string | null;
    confidence: "High" | "Medium" | "Low";
    suggestedAction: string;
    likelySpecs: string[];
    daysSinceLastOrder: number | null;
  };
};

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatShortDate(value: string | null) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function describeSpec(spec: string) {
  const value = spec.toUpperCase();

  if (value.includes("TBR") || value.includes("11R") || value.includes("22.5")) {
    if (value.includes("LONG HAUL")) return "Commercial truck tire for long-haul fleet routes";
    if (value.includes("REGIONAL")) return "Commercial truck tire for regional delivery and freight lanes";
    return "Commercial truck tire for fleet and heavy-duty operations";
  }

  if (value.includes("ALL-TERRAIN")) return "SUV or light truck tire for mixed road and off-road use";
  if (value.includes("SUV") || value.includes("LT") || value.includes("70R18")) {
    return "SUV or light truck tire for utility and pickup applications";
  }

  if (value.includes("TOURING")) return "Passenger car tire focused on comfort and daily road use";
  if (value.includes("UHP") || value.includes("PERFORMANCE")) return "Passenger car performance tire for higher-speed handling";

  return "General passenger or light vehicle tire specification";
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0 || values.every((value) => value === 0)) {
    return <div className="h-24 rounded-lg border border-dashed border-[var(--border2)] bg-[var(--bg3)]" />;
  }
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - (value / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-24 w-full overflow-visible rounded-lg bg-[var(--bg3)] p-2">
      <polyline
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceResponse | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [activeHelp, setActiveHelp] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const loadCustomers = async () => {
    const res = await fetch("/api/customers");
    const data = await safeJson<{ customers?: Customer[] }>(res);
    const list = data.customers || [];
    setCustomers(list);
    if (!selectedCustomerId && list[0]) {
      setSelectedCustomerId(list[0].id);
    }
  };

  const loadIntelligence = async (customerId: string) => {
    setIntelLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/intelligence`);
      const data = await safeJson<IntelligenceResponse & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to load customer intelligence");
      setIntelligence(data);
    } catch (error) {
      console.error(error);
      setIntelligence(null);
    } finally {
      setIntelLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      await loadCustomers();
      setLoading(false);
    }
    init();
    // Initial customer bootstrap only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      loadIntelligence(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await safeJson<{ error?: string }>(res);
        throw new Error(err.error || "Failed");
      }
      setName("");
      setCompany("");
      setEmail("");
      setPhone("");
      setAddress("");
      setShowForm(false);
      await loadCustomers();
    } catch (err) {
      alert(String(err));
    }
  };

  const inputClass = "form-input w-full rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-2.5 text-[13.5px]";
  const labelClass = "form-label mb-1.5 block text-xs font-semibold text-[var(--text-mid)]";
  const monthlyValues = intelligence?.monthlyTrend.map((entry) => entry.units) || [];
  const maxSpecUnits = Math.max(...(intelligence?.topSpecs.map((entry) => entry.units) || [1]));
  const maxFamilyRevenue = Math.max(...(intelligence?.familyMix.map((entry) => entry.revenue) || [1]));
  const reorderGuidance = intelligence?.reorderGuidance ?? {
    expectedWindowStart: null,
    expectedWindowEnd: null,
    confidence: "Low" as const,
    suggestedAction: "Need more order history before assigning a follow-up task.",
    likelySpecs: [],
    daysSinceLastOrder: null,
  };
  const filteredCustomers = customers.filter((customer) => {
    const haystack = [customer.name, customer.company, customer.email, customer.address]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(customerSearch.toLowerCase());
  });

  const toggleHelp = (section: string) => {
    setActiveHelp((current) => (current === section ? null : section));
  };

  const helpButtonClass =
    "inline-flex h-5 w-5 items-center justify-center text-[var(--accent)] transition hover:scale-110";
  const helpContent: Record<string, { title: string; body: string }> = {
    "expected-window": {
      title: "Expected Window",
      body: "This is the estimated time range when the customer is most likely to place the next replenishment order. Sales and operations can use this window to plan outreach, stock checks, and production readiness.",
    },
    confidence: {
      title: "Confidence",
      body: "This measures how stable the customer's reorder rhythm has been in past orders. A higher confidence means the reorder pattern has been more consistent, but it is still a planning signal rather than a confirmed purchase order.",
    },
    "likely-specs": {
      title: "Likely Specs",
      body: "This shows the most probable repeat SKU based on the customer's historical purchase mix. Teams can use it to prepare pricing, review stock, and align production plans ahead of a likely reorder.",
    },
    "suggested-action": {
      title: "Suggested Action",
      body: "This is the recommended internal next step for sales or operations based on reorder timing, days since last order, and purchase stability.",
    },
  };

  return (
    <>
    <div className="page-shell grid items-start gap-4 grid-cols-[300px_minmax(0,1fr)]">
      <div className="card panel-strong flex flex-col self-start" style={{ height: "calc(100vh - 96px)" }}>
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text)]">Customers</h3>
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-[7px] bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1860c4]"
            >
              + Add Customer
            </button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-light)]" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search company, contact, email, city"
              className="w-full rounded-[8px] border border-[var(--border2)] bg-[var(--bg3)] py-2.5 pl-9 pr-3 text-[13px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/10"
            />
          </div>
        </div>
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 rounded-lg border border-[var(--border2)] bg-[var(--bg3)] p-4">
            <div className="grid gap-3 grid-cols-2">
              <div>
                <label className={labelClass}>Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Company</label>
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} className={`${inputClass} min-h-[70px]`} />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="submit" className="rounded-[7px] bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1860c4]">
                Save
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-[7px] border border-[var(--border2)] px-4 py-2 text-[13px] font-semibold text-[var(--text-mid)] hover:bg-[var(--bg)]">
                Cancel
              </button>
            </div>
          </form>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-4 text-center text-[var(--text-dim)]">Loading...</p>
          ) : customers.length === 0 ? (
            <p className="py-4 text-center text-[var(--text-dim)]">No customers yet.</p>
          ) : filteredCustomers.length === 0 ? (
            <p className="py-4 text-center text-[var(--text-dim)]">No customers match your search.</p>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.72)]">
              <div className="border-b border-[var(--border)] bg-[rgba(234,240,247,0.92)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">
                Customer Directory
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {filteredCustomers.map((customer) => {
                const active = customer.id === selectedCustomerId;
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className={`w-full border-b border-[var(--border)] px-4 py-3 text-left transition-all last:border-b-0 ${
                      active
                        ? "bg-[var(--accent-light)]"
                        : "bg-transparent hover:bg-[var(--bg3)]"
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="truncate text-[13px] font-semibold text-[var(--text)]">
                        {customer.company || customer.name || "Unnamed customer"}
                      </div>
                      <div className="truncate text-[12px] text-[var(--text-dim)]">
                        {customer.email || "No email on file"}
                      </div>
                      <div className="truncate text-[12px] text-[var(--text-light)]">
                        {customer.address || "No address on file"}
                      </div>
                    </div>
                  </button>
                );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="card panel-strong">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-[var(--text)]">Customer Intelligence</div>
              <div className="mt-1 text-[12px] text-[var(--text-dim)]">
                Internal planning view for sales, operations, and production follow-up.
              </div>
            </div>
            {reorderGuidance.expectedWindowStart && reorderGuidance.expectedWindowEnd && (
              <div className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent-light)] px-3 py-1.5 text-[12px] font-semibold text-[var(--accent)]">
                Expected reorder window: {formatShortDate(reorderGuidance.expectedWindowStart)} - {formatShortDate(reorderGuidance.expectedWindowEnd)}
              </div>
            )}
          </div>
          {intelLoading || !intelligence ? (
            <div className="rounded-lg border border-dashed border-[var(--border2)] bg-[var(--bg3)] p-8 text-center text-[var(--text-dim)]">
              {intelLoading ? "Analyzing customer purchase history..." : "Select a customer to see intelligence."}
            </div>
          ) : (
            <div className="space-y-4">
            <div className="grid gap-4 grid-cols-[minmax(0,1.15fr)_300px]">
                <div className="relative rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.74)] p-4">
                  <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Reorder Workflow Guidance</div>
                  {activeHelp && helpContent[activeHelp] && (
                    <div className="absolute right-4 top-12 z-10 w-full max-w-sm rounded-xl border border-[var(--border)] bg-white p-4 shadow-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-[var(--text)]">{helpContent[activeHelp].title}</div>
                          <div className="mt-2 text-[13px] leading-6 text-[var(--text-dim)]">{helpContent[activeHelp].body}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveHelp(null)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border2)] text-[var(--text-mid)] hover:bg-[var(--bg3)]"
                          aria-label="Close explanation"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="grid gap-3 grid-cols-3">
                    <div className="rounded-lg border border-[var(--border)] bg-[rgba(234,240,247,0.88)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Expected Window</div>
                        <button
                          type="button"
                          onClick={() => toggleHelp("expected-window")}
                          className={helpButtonClass}
                          aria-label="Explain expected window"
                        >
                          <span className="block h-0 w-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-[var(--accent)]" />
                        </button>
                      </div>
                      <div className="mt-2 text-[14px] font-semibold text-[var(--text)]">
                        {reorderGuidance.expectedWindowStart && reorderGuidance.expectedWindowEnd
                          ? `${formatShortDate(reorderGuidance.expectedWindowStart)} - ${formatShortDate(reorderGuidance.expectedWindowEnd)}`
                          : "Need more history"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[rgba(234,240,247,0.88)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Confidence</div>
                        <button
                          type="button"
                          onClick={() => toggleHelp("confidence")}
                          className={helpButtonClass}
                          aria-label="Explain confidence"
                        >
                          <span className="block h-0 w-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-[var(--accent)]" />
                        </button>
                      </div>
                      <div className="mt-2 text-[14px] font-semibold text-[var(--text)]">{reorderGuidance.confidence}</div>
                      <div className="mt-1 text-[11px] text-[var(--text-dim)]">
                        {reorderGuidance.daysSinceLastOrder != null
                          ? `${reorderGuidance.daysSinceLastOrder} days since last order`
                          : "Waiting for more repeat orders"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[rgba(234,240,247,0.88)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Likely Specs</div>
                        <button
                          type="button"
                          onClick={() => toggleHelp("likely-specs")}
                          className={helpButtonClass}
                          aria-label="Explain likely specs"
                        >
                          <span className="block h-0 w-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-[var(--accent)]" />
                        </button>
                      </div>
                      <div className="mt-2 text-[14px] font-semibold text-[var(--text)]">
                        {reorderGuidance.likelySpecs[0] || "No clear spec"}
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--text-dim)]">
                        {reorderGuidance.likelySpecs[0]
                          ? describeSpec(reorderGuidance.likelySpecs[0])
                          : "No additional repeat pattern"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-[var(--border)] bg-[rgba(234,240,247,0.88)] px-3 py-3 text-[13px] text-[var(--text)]">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Suggested Action</div>
                      <button
                        type="button"
                        onClick={() => toggleHelp("suggested-action")}
                        className={helpButtonClass}
                        aria-label="Explain suggested action"
                      >
                        <span className="block h-0 w-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-[var(--accent)]" />
                      </button>
                    </div>
                    {reorderGuidance.suggestedAction}
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.74)] p-4">
                  <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Demand Signals</div>
                  <div className="space-y-3">
                    {intelligence.demandSignals.map((signal) => (
                      <div key={signal} className="rounded-lg border border-[var(--border)] bg-[rgba(234,240,247,0.88)] px-3 py-2 text-[13px] text-[var(--text)]">
                        {signal}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-4">
                <div className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.74)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Total Orders</div>
                  <div className="mt-2 text-[1.25rem] font-bold leading-none text-[var(--text)]">{intelligence.summary.totalOrders}</div>
                  <div className="mt-1 text-[12px] text-[var(--text-dim)]">Across full customer order history</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.74)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Lifetime Units</div>
                  <div className="mt-2 text-[1.25rem] font-bold leading-none text-[var(--text)]">{intelligence.summary.totalUnits.toLocaleString()}</div>
                  <div className="mt-1 text-[12px] text-[var(--text-dim)]">{intelligence.summary.activeSpecs} tire specs purchased historically</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.74)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Lifetime Order Value</div>
                  <div className="mt-2 text-[1.25rem] font-bold leading-none text-[var(--text)]">{formatMoney(intelligence.summary.totalOrderValue)}</div>
                  <div className="mt-1 text-[12px] text-[var(--text-dim)]">Average {formatMoney(intelligence.summary.avgOrderValue)} per order</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.74)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Avg Reorder Interval</div>
                  <div className="mt-2 text-[1.25rem] font-bold leading-none text-[var(--text)]">{intelligence.summary.avgDaysBetweenOrders ?? "—"}</div>
                  <div className="mt-1 text-[12px] text-[var(--text-dim)]">{intelligence.summary.cadenceLabel}</div>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.74)] p-4">
                  <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">12-Month Order Trend</div>
                  <div className="mb-3 text-[12px] text-[var(--text-dim)]">Monthly units purchased over the last 12 months.</div>
                  <Sparkline values={monthlyValues} />
                  <div className="mt-3 grid grid-cols-6 gap-2 text-[10px] text-[var(--text-light)]">
                    {intelligence.monthlyTrend.slice(-6).map((point) => (
                      <div key={point.month} className="rounded-lg border border-[var(--border)] bg-[rgba(234,240,247,0.88)] px-2 py-2 text-center">
                        <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-light)]">
                          {new Date(`${point.month}-01`).toLocaleDateString("en-US", { month: "short" })}
                        </div>
                        <div className="mt-1 text-[13px] font-semibold text-[var(--text-mid)]">{point.units}</div>
                        <div className="mt-0.5 text-[10px] text-[var(--text-dim)]">units</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.74)] p-4">
                  <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Recommended Actions</div>
                  <div className="space-y-3 text-[13px] text-[var(--text)]">
                    <div className="rounded-lg border border-[var(--border)] bg-[rgba(234,240,247,0.88)] px-3 py-2">
                      Use the reorder window to decide when sales should contact the account.
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[rgba(234,240,247,0.88)] px-3 py-2">
                      Use likely specs to prepare quotes, stock checks, or production planning.
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[rgba(234,240,247,0.88)] px-3 py-2">
                      Treat confidence as a planning signal, not a guaranteed customer PO.
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.74)] p-4">
                  <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Top Tire Specs</div>
                  <div className="space-y-3">
                    {intelligence.topSpecs.map((spec) => (
                      <div key={spec.spec}>
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="font-medium text-[var(--text)]">{spec.spec}</span>
                          <span className="text-[var(--text-dim)]">{spec.units.toLocaleString()} units</span>
                        </div>
                        <div className="mt-1 text-[11px] text-[var(--text-dim)]">{describeSpec(spec.spec)}</div>
                        <div className="mt-1 h-2 rounded-full bg-[rgba(234,240,247,0.92)]">
                          <div
                            className="h-2 rounded-full bg-[var(--accent)]"
                            style={{ width: `${Math.max((spec.units / maxSpecUnits) * 100, 6)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.74)] p-4">
                  <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-light)]">Tire Family Mix</div>
                  <div className="space-y-3">
                    {intelligence.familyMix.map((family) => (
                      <div key={family.family}>
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="font-medium text-[var(--text)]">{family.family}</span>
                          <span className="text-[var(--text-dim)]">{formatMoney(family.revenue)}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-[rgba(234,240,247,0.92)]">
                          <div
                            className="h-2 rounded-full bg-[var(--accent3)]"
                            style={{ width: `${Math.max((family.revenue / maxFamilyRevenue) * 100, 6)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
