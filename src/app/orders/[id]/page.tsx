"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { safeJson } from "@/lib/safe-json";
import { CustomerAutocomplete, type Customer } from "@/components/CustomerAutocomplete";

const STATUS_OPTIONS = ["PENDING", "URGENT", "PRODUCTION", "QC_CHECK", "SHIPPED"];
const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  URGENT: "Urgent",
  PRODUCTION: "Production",
  QC_CHECK: "QC Check",
  SHIPPED: "Complete",
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  customerId: string | null;
  customerName: string | null;
  tireSpec: string | null;
  quantity: number;
  value: number | null;
  dueDate: string | null;
  createdAt: string;
  customer?: { id: string; name: string | null; company: string | null } | null;
};

export default function OrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerObj, setCustomerObj] = useState<Customer | null>(null);
  const [tireSpec, setTireSpec] = useState("");
  const [quantity, setQuantity] = useState("");
  const [value, setValue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/orders/${id}`)
      .then((r) => safeJson<{ order?: Order; error?: string }>(r))
      .then((d) => {
        if (d.error || !d.order) {
          setOrder(null);
          return;
        }
        const o = d.order;
        setOrder(o);
        setCustomerName(o.customerName ?? o.customer?.company ?? o.customer?.name ?? "");
        setTireSpec(o.tireSpec ?? "");
        setQuantity(String(o.quantity ?? ""));
        setValue(o.value != null ? String(o.value) : "");
        setDueDate(o.dueDate ? o.dueDate.slice(0, 10) : "");
        setStatus(o.status ?? "PENDING");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerObj?.id,
          customerName: customerName.trim() || null,
          tireSpec: tireSpec.trim() || null,
          quantity: Number(quantity) || 0,
          value: value ? Number(value) : null,
          dueDate: dueDate || null,
          status,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const d = await safeJson<{ order?: Order }>(res);
      setOrder(d.order ?? null);
    } catch {
      alert("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "form-input w-full rounded-[7px] border border-[var(--border2)] bg-[var(--bg)] px-3 py-2.5 text-[13.5px]";
  const labelClass = "form-label mb-1.5 block text-xs font-semibold text-[var(--text-mid)]";

  if (loading) return <p className="text-[var(--text-dim)]">Loading...</p>;
  if (!order) return <p className="text-[var(--text-dim)]">Order not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/orders" className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent)] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
      </div>
      <div className="card max-w-2xl">
        <h3 className="mb-4 text-sm font-bold text-[var(--text)]">Order #{order.orderNumber}</h3>
        <div className="space-y-3.5">
          <div>
            <label className={labelClass}>Customer</label>
            <CustomerAutocomplete
              value={customerName}
              onChange={(v, c) => { setCustomerName(v); setCustomerObj(c ?? null); }}
            />
          </div>
          <div>
            <label className={labelClass}>Tire Spec</label>
            <input type="text" value={tireSpec} onChange={(e) => setTireSpec(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Quantity</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Value (USD)</label>
              <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{statusLabels[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-[7px] bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1860c4] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
        <p className="mt-4 text-xs text-[var(--text-dim)]">
          Created {new Date(order.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
