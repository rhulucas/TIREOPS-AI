"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CustomerAutocomplete, type Customer } from "@/components/CustomerAutocomplete";
import { safeJson } from "@/lib/safe-json";

type OrderStatus = "URGENT" | "PENDING" | "PRODUCTION" | "QC_CHECK" | "SHIPPED" | "DELIVERED" | "COMPLETE";

const statusLabels: Record<string, string> = {
  URGENT: "Urgent",
  PENDING: "Pending",
  PRODUCTION: "Production",
  QC_CHECK: "QC Check",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  COMPLETE: "Delivered",
};

const statusClass: Record<string, string> = {
  URGENT: "badge-urgent",
  PENDING: "badge-pending",
  PRODUCTION: "badge-production",
  QC_CHECK: "badge-qc",
  SHIPPED: "badge-complete",
  COMPLETE: "badge-complete",
};

const STATUS_OPTIONS: OrderStatus[] = ["PENDING", "URGENT", "PRODUCTION", "QC_CHECK", "SHIPPED", "DELIVERED"];
const LATEST_ORDER_STORAGE_KEY = "tireops_latest_order";

interface OrderRow {
  id: string;
  orderNumber: string;
  rawOrderNumber: string;
  status: string;
  customerName: string | null;
  tireSpec: string | null;
  quantity: number;
  value: string;
  dueDate: string;
  createdAt: string;
}

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" });
}

const DEMO_CUSTOMERS: Record<number, string[]> = {
  2026: ["Fleet Solutions Ltd", "ABC Logistics", "National Trucking", "Regional Fleet Co", "City Delivery Inc", "Swift Transport", "Quick Haul Inc", "Pro Logistics", "Elite Fleet Co", "Prime Cargo", "Apex Trucking", "Summit Freight", "Valley Logistics", "Ridge Transport", "Coast Line Haulers", "Delta Fleet", "Omega Trucking", "Alpha Express", "Pioneer Logistics", "Heritage Transport", "Nova Logistics", "Vertex Freight", "Horizon Fleet", "Pinnacle Trucking", "Atlas Transport", "Titan Cargo", "Meridian Logistics", "Zenith Fleet", "Cascade Haulers", "Aurora Express"],
  2025: ["Prev Year Fleet", "Midwest Transport", "Older Corp", "Pacific Haulers", "East Coast Logistics", "Central Tire Co", "Southern Fleet", "Northern Express", "Metro Delivery", "Western Trucking", "Riverside Transport", "Lakeside Logistics", "Mountain Cargo", "Desert Fleet", "Plains Haulers", "Coastal Express", "Heartland Trucking", "Crossroads Logistics", "Frontier Transport", "Border Fleet", "Gateway Cargo", "Harbor Logistics", "Prairie Express", "Canyon Transport", "Valley Fleet", "Bay Area Logistics", "Metroplex Cargo", "Tri-State Transport", "Great Lakes Fleet", "Sunbelt Haulers"],
  2024: ["Vintage Fleet Co", "Classic Transport", "Legacy Logistics", "Heritage Trucking", "Traditional Cargo", "Established Fleet", "Proven Transport", "Reliable Logistics", "Steady Haulers", "Trusted Express", "Solid Fleet", "Dependable Cargo", "Stable Logistics", "Consistent Transport", "Enduring Fleet", "Lasting Logistics", "Timeless Transport", "Enduring Cargo", "Persistent Fleet", "Resilient Logistics", "Stalwart Transport", "Constant Fleet", "Steadfast Cargo", "Unwavering Logistics", "Tenacious Transport", "Abiding Fleet", "Perennial Cargo", "Sustained Logistics", "Chronicled Transport", "Archived Fleet"],
  2023: ["Retro Logistics", "Throwback Transport", "Yesteryear Fleet", "Former Cargo", "Prior Logistics", "Earlier Transport", "Past Fleet", "Bygone Cargo", "Former Era Logistics", "Historical Transport", "Antique Fleet", "Vintage Era Cargo", "Classic Period Logistics", "Old Guard Transport", "Original Fleet", "Initial Cargo", "First Wave Logistics", "Early Bird Transport", "Founding Fleet", "Genesis Cargo", "Inception Logistics", "Origin Transport", "Birth Fleet", "Dawn Cargo", "Beginning Logistics", "Start Transport", "Launch Fleet", "Commence Cargo", "Initiate Logistics", "Establish Transport"],
  2022: ["Legacy 22 Fleet", "Pandemic Era Logistics", "Recovery Transport", "Rebound Cargo", "Comeback Fleet", "Return Logistics", "Restart Transport", "Renewal Cargo", "Revival Fleet", "Resurgence Logistics", "Reawaken Transport", "Rekindle Cargo", "Restore Fleet", "Renew Logistics", "Revive Transport", "Refresh Cargo", "Replenish Fleet", "Reinstate Logistics", "Reestablish Transport", "Reintroduce Cargo", "Reinvent Fleet", "Reimagine Logistics", "Reconfigure Transport", "Reorganize Cargo", "Redeploy Fleet", "Reactivate Logistics", "Reengage Transport", "Reconnect Cargo", "Reintegrate Fleet", "Reconsolidate Logistics"],
  2021: ["Pre-Supply Chain Fleet", "Early Pandemic Cargo", "Transition Logistics", "Adapt Transport", "Pivot Fleet", "Shift Cargo", "Adjust Logistics", "Modify Transport", "Change Fleet", "Alter Cargo", "Convert Logistics", "Transform Transport", "Evolve Fleet", "Develop Cargo", "Grow Logistics", "Expand Transport", "Scale Fleet", "Build Cargo", "Create Logistics", "Establish Transport", "Form Fleet", "Set Up Cargo", "Initiate Logistics", "Introduce Transport", "Launch Fleet", "Open Cargo", "Start Logistics", "Begin Transport", "Commence Fleet", "Inaugurate Cargo"],
};
const DEMO_SPECS: Record<number, string[]> = {
  2026: ["225/65R17 95H", "265/70R18 116L", "315/80R22.5", "245/40R18", "205/55R16 91V", "235/65R17", "275/70R18 116L", "225/70R19.5", "245/75R16", "255/65R17", "285/70R17", "215/60R17", "245/50R18", "305/70R18", "195/65R15", "265/70R17", "235/55R18", "295/75R22.5", "175/70R14", "265/60R18", "195/55R16", "275/55R20", "225/55R17", "245/70R17", "205/60R16", "235/60R18", "255/55R19", "285/65R18", "215/55R17", "265/55R19"],
  2025: ["225/60R18 100V", "265/65R18 116H", "245/45R18", "205/60R16 92H", "235/60R18 103V", "275/65R18", "215/55R17", "255/60R18", "195/60R16", "285/65R17", "245/55R18", "205/65R15", "265/60R18", "235/65R17", "225/55R17", "295/70R18", "215/60R16", "255/55R18", "195/55R15", "275/60R18", "245/50R17", "205/70R15", "265/55R18", "235/55R17", "225/60R17", "285/60R18", "215/65R16", "255/65R17", "195/65R16", "275/55R19"],
  2024: ["225/65R16 98H", "245/70R17 108T", "265/75R16 120R", "195/65R15 91T", "235/70R16 106T", "275/70R17 121R", "205/70R15 96T", "255/70R17 110T", "215/60R16 95H", "285/70R17 116R", "245/65R17 107T", "205/55R16 91H", "265/70R16 112R", "235/60R17 102H", "225/70R16 103T", "295/75R16 124R", "195/60R15 88H", "255/65R16 109T", "245/45R17 95H", "275/65R17 115R", "215/55R16 93V", "205/60R15 91H", "265/60R17 108H", "235/55R17 99V", "225/55R16 95H", "285/65R17 116H", "215/65R15 98H", "255/55R17 101V", "195/55R16 87H", "275/55R18 109V"],
  2023: ["225/70R15 100S", "245/75R16 110T", "265/70R16 115R", "195/70R14 91S", "235/75R15 105S", "275/65R16 118R", "205/75R15 97S", "255/70R16 111T", "215/70R15 98S", "285/70R16 121R", "245/70R16 107T", "205/65R15 94H", "265/65R16 112R", "235/65R16 103T", "225/75R16 104S", "295/70R17 121R", "195/65R14 89H", "255/65R15 109T", "245/65R16 105T", "275/60R17 115R", "215/65R15 96H", "205/70R14 95S", "265/60R16 107H", "235/60R16 100H", "225/65R15 100H", "285/60R17 117H", "215/60R15 94H", "255/60R17 106H", "195/60R14 86H", "275/55R17 109V"],
  2022: ["225/60R16 98H", "245/65R17 107T", "265/70R15 112R", "195/65R14 90T", "235/70R15 104T", "275/65R15 116R", "205/65R14 94H", "255/70R15 110T", "215/65R14 96H", "285/65R16 120R", "245/60R17 105T", "205/60R14 91H", "265/65R15 111R", "235/65R15 102T", "225/70R15 101T", "295/70R16 121R", "195/60R14 87H", "255/65R14 108T", "245/55R16 102V", "275/60R16 114R", "215/60R14 93H", "205/55R15 88V", "265/60R15 106H", "235/55R16 98V", "225/55R15 94H", "285/60R16 116H", "215/55R15 91V", "255/55R16 103V", "195/55R15 85V", "275/55R17 110V"],
  2021: ["225/65R15 100H", "245/70R16 108T", "265/75R15 115R", "195/70R14 90S", "235/75R15 104S", "275/70R16 118R", "205/75R14 96S", "255/70R15 110T", "215/70R14 97S", "285/70R15 120R", "245/65R15 106T", "205/65R14 93H", "265/70R15 112R", "235/65R15 102T", "225/70R14 100T", "295/70R16 121R", "195/65R13 88H", "255/65R14 108T", "245/60R16 104T", "275/65R16 115R", "215/65R13 95H", "205/70R13 94S", "265/65R14 106H", "235/60R15 99H", "225/65R14 99H", "285/65R15 117H", "215/60R13 92H", "255/60R16 105H", "195/60R13 85H", "275/55R16 108V"],
};
const DEMO_STATUSES = ["URGENT", "PENDING", "PRODUCTION", "QC_CHECK", "COMPLETE"] as const;
const YEAR_BASE_PRICE: Record<number, number> = { 2026: 95, 2025: 88, 2024: 82, 2023: 76, 2022: 72, 2021: 68 };
// Different status mix per year: [URGENT, PENDING, PRODUCTION, QC_CHECK, COMPLETE]
const YEAR_STATUS_MIX: Record<number, number[]> = {
  2026: [5, 8, 6, 4, 7],
  2025: [4, 6, 8, 5, 7],
  2024: [6, 5, 7, 6, 6],
  2023: [3, 7, 5, 8, 7],
  2022: [7, 4, 6, 7, 6],
  2021: [6, 6, 4, 5, 9],
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateDemoOrders(): OrderRow[] {
  const rows: OrderRow[] = [];
  let idx = 1;
  for (const year of [2026, 2025, 2024, 2023, 2022, 2021]) {
    const customers = DEMO_CUSTOMERS[year];
    const specs = DEMO_SPECS[year];
    const basePrice = YEAR_BASE_PRICE[year];
    const mix = YEAR_STATUS_MIX[year];
    const statusSeq: string[] = [];
    mix.forEach((count, s) => {
      for (let j = 0; j < count; j++) statusSeq.push(DEMO_STATUSES[s]);
    });
    for (let i = 0; i < 30; i++) {
      const ordNum = 2800 + (2026 - year) * 100 + i;
      const qty = [80, 120, 150, 200, 240, 300, 350, 400, 450, 500][(year + i) % 10];
      const up = basePrice + [0, 5, 10, 15, 20, 25, 30, 35, 40][(year + i) % 9];
      const val = qty * up;
      const month = ((year * 7 + i) % 12) + 1;
      const day = ((year + i * 3) % 28) + 1;
      const createdAt = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(10 + (i + year) % 8).padStart(2, "0")}:00:00Z`;
      const dueDate = new Date(createdAt);
      dueDate.setDate(dueDate.getDate() + 14);
      rows.push({
        id: String(idx++),
        orderNumber: `#T0-${ordNum}`,
        rawOrderNumber: `#T0-${ordNum}`,
        status: statusSeq[i] ?? DEMO_STATUSES[i % 5],
        customerName: customers[i % customers.length],
        tireSpec: specs[i % specs.length],
        quantity: qty,
        value: `$${val.toLocaleString()}`,
        dueDate: formatDate(dueDate),
        createdAt,
      });
    }
  }
  return rows;
}

function OrdersContent() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newOrderNumber, setNewOrderNumber] = useState("");
  const [newCustomer, setNewCustomer] = useState("");
  const [newCustomerObj, setNewCustomerObj] = useState<Customer | null>(null);
  const [newTireSpec, setNewTireSpec] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"default" | "newest" | "oldest">("default");
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pinnedOrder, setPinnedOrder] = useState<OrderRow | null>(null);
  const pageSize = 25;
  const highlightedOrderId = searchParams.get("newOrderId");

  const loadOrders = async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      status: statusFilter,
      year: yearFilter,
    });
    if (sortOrder !== "default") params.set("sort", sortOrder);
    const r = await fetch(`/api/orders?${params.toString()}`);
    const d = await safeJson<{
      orders?: {
        id: string;
        orderNumber: string;
        status: string;
        customerName: string | null;
        tireSpec: string | null;
        quantity: number;
        value: number | null;
        dueDate: string | null;
        createdAt: string;
        customer?: { name: string | null; company: string | null } | null;
      }[];
      total?: number;
      error?: string;
    }>(r);
    if (d.error) return;
    const list = (d.orders || []).map((o) => {
      const val = o.value ?? (o.quantity * 85);
      return {
        id: o.id,
        orderNumber: o.orderNumber.startsWith("T0") || o.orderNumber.startsWith("#") ? o.orderNumber : `#T0-${o.orderNumber.replace(/\D/g, "")}`,
        rawOrderNumber: o.orderNumber,
        status: o.status,
        customerName: o.customerName ?? o.customer?.name ?? o.customer?.company ?? null,
        tireSpec: o.tireSpec,
        quantity: o.quantity,
        value: `$${val.toLocaleString()}`,
        dueDate: formatDate(o.dueDate ?? o.createdAt),
        createdAt: o.createdAt || new Date().toISOString(),
      };
    });
    setOrders(list);
    setTotalOrders(d.total || 0);
  };

  useEffect(() => {
    loadOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, yearFilter, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, yearFilter, sortOrder]);

  useEffect(() => {
    if (highlightedOrderId) {
      const nextHighlightedOrder: OrderRow = {
        id: highlightedOrderId,
        orderNumber: searchParams.get("orderNumber") || "",
        rawOrderNumber: searchParams.get("orderNumber") || "",
        status: "PENDING",
        customerName: searchParams.get("customerName") || null,
        tireSpec: searchParams.get("tireSpec") || null,
        quantity: Number(searchParams.get("quantity") || 0) || 0,
        value: searchParams.get("value") ? `$${Number(searchParams.get("value") || 0).toLocaleString()}` : "—",
        dueDate: "—",
        createdAt: searchParams.get("createdAt") || new Date().toISOString(),
      };
      setPinnedOrder(nextHighlightedOrder);
      window.localStorage.setItem(LATEST_ORDER_STORAGE_KEY, JSON.stringify(nextHighlightedOrder));
      return;
    }
    const saved = window.localStorage.getItem(LATEST_ORDER_STORAGE_KEY);
    if (!saved) return;
    try {
      setPinnedOrder(JSON.parse(saved) as OrderRow);
    } catch {
      window.localStorage.removeItem(LATEST_ORDER_STORAGE_KEY);
    }
  }, [highlightedOrderId, searchParams]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderNumber.trim() || !newTireSpec.trim() || !newQuantity) return;
    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: newOrderNumber.trim(),
          customerId: newCustomerObj?.id,
          customerName: newCustomer.trim() || undefined,
          tireSpec: newTireSpec.trim(),
          quantity: Number(newQuantity),
          value: newValue ? Number(newValue) : undefined,
          dueDate: newDueDate || undefined,
        }),
      });
      if (!res.ok) {
        const err = await safeJson<{ error?: string }>(res);
        throw new Error(err.error || "Failed");
      }
      setShowNew(false);
      setNewOrderNumber("");
      setNewCustomer("");
      setNewCustomerObj(null);
      setNewTireSpec("");
      setNewQuantity("");
      setNewValue("");
      setNewDueDate("");
      loadOrders();
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      loadOrders();
    } catch {
      alert("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 6 }, (_, i) => (currentYear - i).toString());
  const displayOrders = pinnedOrder
    ? [pinnedOrder, ...orders.filter((order) => order.id !== pinnedOrder.id)]
    : orders;

  const kpiOrders = displayOrders;
  const open = kpiOrders.length;
  const urgent = kpiOrders.filter((o) => o.status === "URGENT").length;
  const inProd = kpiOrders.filter((o) => o.status === "PRODUCTION").length;
  const inQc = kpiOrders.filter((o) => o.status === "QC_CHECK" || o.status === "COMPLETE").length;

  const kpis = [
    { label: "Open Orders", value: open, color: "text-[var(--text)]" },
    { label: "Urgent", value: urgent, color: "text-[var(--accent2)]" },
    { label: "In Production", value: inProd, color: "text-[var(--accent)]" },
    { label: "In QC / Ready", value: inQc, color: "text-[var(--accent3)]" },
  ];

  return (
    <div className="page-shell flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        {yearFilter !== "all" && (
          <p className="mb-2 text-[10px] font-semibold text-[var(--text-dim)]">
            Stats for year {yearFilter}
          </p>
        )}
        <div className="grid grid-cols-4 gap-4">
          {kpis.map((k) => (
          <div key={k.label} className="kpi-card flex flex-col gap-0.5 p-4">
            <span className="text-[10px] font-semibold text-[var(--text-dim)]">{k.label}</span>
            <span className={`text-lg font-bold ${k.color}`}>{k.value}</span>
          </div>
        ))}
        </div>
      </div>

      <div className="card panel-strong flex min-h-0 flex-1 flex-col">
        <div className="mb-3 shrink-0 flex flex-col gap-3">
          <div>
            <h3 className="text-xs font-bold text-[var(--text)]">Production Order Queue</h3>
            <p className="text-[10px] text-[var(--text-dim)]">All active tire manufacturing orders.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
              <span className="text-[10px] font-semibold text-[var(--text-dim)]">Year:</span>
              <button
                type="button"
                onClick={() => setYearFilter("all")}
                className={`shrink-0 whitespace-nowrap rounded-[6px] px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                  yearFilter === "all"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "border border-[var(--border2)] bg-[var(--bg)] text-[var(--text-mid)] hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]"
                }`}
              >
                All
              </button>
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setYearFilter(yr)}
                  className={`shrink-0 whitespace-nowrap rounded-[6px] px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                    yearFilter === yr
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "border border-[var(--border2)] bg-[var(--bg)] text-[var(--text-mid)] hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
              <span className="text-[10px] font-semibold text-[var(--text-dim)]">Status:</span>
              {[
                { value: "all", label: "All" },
                { value: "PENDING", label: "Pending" },
                { value: "URGENT", label: "Urgent" },
                { value: "PRODUCTION", label: "Production" },
                { value: "QC_CHECK", label: "QC Check" },
                { value: "COMPLETE", label: "Complete" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`shrink-0 whitespace-nowrap rounded-[6px] px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                    statusFilter === value
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "border border-[var(--border2)] bg-[var(--bg)] text-[var(--text-mid)] hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]"
                  }`}
                >
                  {label}
                </button>
                ))}
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
                <span className="text-[10px] font-semibold text-[var(--text-dim)]">Sort:</span>
                <button
                  type="button"
                  onClick={() => setSortOrder("newest")}
                  className={`shrink-0 rounded-[6px] px-2 py-1 text-[10px] font-medium transition-all ${
                    sortOrder === "newest" ? "bg-[var(--bg3)] font-semibold text-[var(--text)]" : "text-[var(--text-dim)] hover:text-[var(--text-mid)]"
                  }`}
                >
                  Newest
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder("default")}
                  className={`shrink-0 rounded-[6px] px-2 py-1 text-[10px] font-medium transition-all ${
                    sortOrder === "default" ? "bg-[var(--bg3)] font-semibold text-[var(--text)]" : "text-[var(--text-dim)] hover:text-[var(--text-mid)]"
                  }`}
                >
                  Default
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder("oldest")}
                  className={`shrink-0 rounded-[6px] px-2 py-1 text-[10px] font-medium transition-all ${
                    sortOrder === "oldest" ? "bg-[var(--bg3)] font-semibold text-[var(--text)]" : "text-[var(--text-dim)] hover:text-[var(--text-mid)]"
                  }`}
                >
                  Oldest
                </button>
              </div>
              <button
                onClick={() => setShowNew(true)}
                className="inline-flex shrink-0 items-center whitespace-nowrap rounded-[6px] bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:bg-[#1860c4]"
              >
                + New Order
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="table-demo w-full">
            <thead className="sticky top-0 z-10 bg-[var(--bg2)] shadow-[0_1px_0_0_var(--border)]">
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Tire Spec</th>
                <th>Qty</th>
                <th>Value</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Update</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[var(--text-dim)]">
                    No orders for this selection. Try another year or status.
                  </td>
                </tr>
              ) : (
                displayOrders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link href={`/orders/${o.id}`} className="font-medium text-[var(--accent)] hover:underline">
                        {o.orderNumber}
                      </Link>
                      {pinnedOrder?.id === o.id && (
                        <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--accent)]">
                          New
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{o.customerName || "—"}</td>
                  <td>{o.tireSpec || "—"}</td>
                  <td>{o.quantity}</td>
                  <td className="font-semibold">{o.value}</td>
                  <td>{o.dueDate}</td>
                  <td>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        statusClass[o.status] || "badge-pending"
                      }`}
                    >
                      {statusLabels[o.status] || o.status}
                    </span>
                  </td>
                  <td>
                    <select
                      value={o.status === "COMPLETE" ? "DELIVERED" : o.status}
                      onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                      disabled={!!updating}
                      className="rounded-[6px] border border-[var(--border2)] bg-[var(--bg)] px-2 py-1 text-[11px] font-semibold text-[var(--text-mid)]"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{statusLabels[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {(o.status === "SHIPPED" || o.status === "DELIVERED" || o.status === "COMPLETE") && (
                      <Link
                        href={`/invoice?orderId=${o.id}&orderRef=${encodeURIComponent(o.rawOrderNumber)}&customer=${encodeURIComponent(o.customerName || "")}&tireSpec=${encodeURIComponent(o.tireSpec || "")}&quantity=${o.quantity}&value=${o.value.replace(/[$,]/g, "")}`}
                        className="inline-flex items-center gap-1 rounded-[6px] border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 whitespace-nowrap"
                      >
                        📄 Invoice
                      </Link>
                    )}
                    {(o.status === "PENDING" || o.status === "PRODUCTION") && (
                      <Link
                        href={`/email?scenario=Quote+Follow-up&orderId=${o.id}`}
                        className="inline-flex items-center gap-1 rounded-[6px] border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100 whitespace-nowrap"
                      >
                        ✉ Email
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px] text-[var(--text-dim)]">
          <span>Showing {(page - 1) * pageSize + (displayOrders.length ? 1 : 0)}-{(page - 1) * pageSize + displayOrders.length} of {totalOrders}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * pageSize >= totalOrders}
              className="rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto">
            <h3 className="mb-4 text-sm font-bold text-[var(--text)]">New Order</h3>
            <form onSubmit={handleCreateOrder} className="space-y-3.5">
              <div>
                <label className="form-label mb-1.5 block text-xs font-semibold text-[var(--text-mid)]">Order Number *</label>
                <input
                  type="text"
                  value={newOrderNumber}
                  onChange={(e) => setNewOrderNumber(e.target.value)}
                  className="form-input w-full rounded-[7px] border border-[var(--border2)] px-3 py-2.5"
                  placeholder="e.g. ORD-004"
                  required
                />
              </div>
              <div>
                <label className="form-label mb-1.5 block text-xs font-semibold text-[var(--text-mid)]">Customer</label>
                <CustomerAutocomplete
                  value={newCustomer}
                  onChange={(v, c) => { setNewCustomer(v); setNewCustomerObj(c ?? null); }}
                  placeholder="Search customer"
                />
              </div>
              <div>
                <label className="form-label mb-1.5 block text-xs font-semibold text-[var(--text-mid)]">Tire Spec *</label>
                <input
                  type="text"
                  value={newTireSpec}
                  onChange={(e) => setNewTireSpec(e.target.value)}
                  className="form-input w-full rounded-[7px] border border-[var(--border2)] px-3 py-2.5"
                  placeholder="e.g. 225/65R17 95H"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label mb-1.5 block text-xs font-semibold text-[var(--text-mid)]">Quantity *</label>
                  <input
                    type="number"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="form-input w-full rounded-[7px] border border-[var(--border2)] px-3 py-2.5"
                    required
                  />
                </div>
                <div>
                  <label className="form-label mb-1.5 block text-xs font-semibold text-[var(--text-mid)]">Value (USD)</label>
                  <input
                    type="number"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="form-input w-full rounded-[7px] border border-[var(--border2)] px-3 py-2.5"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="form-label mb-1.5 block text-xs font-semibold text-[var(--text-mid)]">Due Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="form-input w-full rounded-[7px] border border-[var(--border2)] px-3 py-2.5"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="rounded-[7px] bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1860c4] disabled:opacity-50">
                  Create Order
                </button>
                <button type="button" onClick={() => setShowNew(false)} className="rounded-[7px] border border-[var(--border2)] px-4 py-2 text-[13px] font-semibold text-[var(--text-mid)] hover:bg-[var(--bg)]">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--text-dim)]">Loading orders...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
