"use client";

import { useEffect, useState } from "react";
import { safeJson } from "@/lib/safe-json";

interface LineStatus {
  name: string;
  status: "RUNNING" | "STOPPED" | "MAINTENANCE";
  efficiency: number;
  qcFails: number;
  label: string;
}

type Activity = {
  color: string;
  title: string;
  sub: string;
};

export default function DashboardPage() {
  const [lines, setLines] = useState<LineStatus[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [kpis, setKpis] = useState({
    unitsQuotedWeek: 0,
    unitsQuotedDelta: 0,
    openOrders: 0,
    ordersAddedToday: 0,
    avgEfficiency: 0,
    totalQcFailsMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        const data = await safeJson<{
          kpis?: typeof kpis;
          productionLines?: LineStatus[];
          recentActivity?: Activity[];
        }>(res);
        if (data.kpis) setKpis(data.kpis);
        setLines(data.productionLines || []);
        setActivities(data.recentActivity || []);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="page-shell space-y-4">
      <div className="mb-5 grid grid-cols-4 gap-3.5">
        <div className="kpi-card p-5">
          <div className="mb-1.5 text-xs font-medium text-[var(--text-dim)]">
            Units Quoted (Week)
          </div>
          <div className="text-[32px] font-bold leading-none text-[var(--text)]">
            {loading ? "..." : kpis.unitsQuotedWeek.toLocaleString()}
          </div>
          <div className="mt-1.5 text-xs text-[var(--accent3)]">
            {kpis.unitsQuotedDelta >= 0 ? "▲" : "▼"} {Math.abs(kpis.unitsQuotedDelta)}% vs last week
          </div>
          <div className="mt-3 flex items-end gap-0.5" style={{ height: 36 }}>
            {[40, 55, 45, 70, 80, 90, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${h}%`,
                  background: i === 6 ? "var(--accent)" : "#bfdbfe",
                }}
              />
            ))}
          </div>
        </div>
        <div className="kpi-card p-5">
          <div className="mb-1.5 text-xs font-medium text-[var(--text-dim)]">
            Open Production Orders
          </div>
          <div className="text-[32px] font-bold leading-none" style={{ color: "var(--amber)" }}>
            {loading ? "..." : kpis.openOrders.toLocaleString()}
          </div>
          <div className="mt-1.5 text-xs" style={{ color: "var(--amber)" }}>
            ▲ {kpis.ordersAddedToday} added today
          </div>
          <div className="mt-3 flex items-end gap-0.5" style={{ height: 36 }}>
            {[50, 70, 60, 80, 75, 90, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${h}%`,
                  background: i === 6 ? "var(--amber)" : "#fde68a",
                }}
              />
            ))}
          </div>
        </div>
        <div className="kpi-card p-5">
          <div className="mb-1.5 text-xs font-medium text-[var(--text-dim)]">
            Tread Pattern Efficiency
          </div>
          <div className="text-[32px] font-bold leading-none" style={{ color: "var(--accent3)" }}>
            {loading ? "..." : `${kpis.avgEfficiency.toFixed(1)}%`}
          </div>
          <div className="mt-1.5 text-xs text-[var(--accent3)]">Live from production lines</div>
          <div className="mt-3 flex items-end gap-0.5" style={{ height: 36 }}>
            {[70, 78, 83, 87, 91, 94, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${h}%`,
                  background: i === 6 ? "var(--accent3)" : "#bbf7d0",
                }}
              />
            ))}
          </div>
        </div>
        <div className="kpi-card p-5">
          <div className="mb-1.5 text-xs font-medium text-[var(--text-dim)]">
            QC Failures (Month)
          </div>
          <div className="text-[32px] font-bold leading-none" style={{ color: "var(--accent2)" }}>
            {loading ? "..." : kpis.totalQcFailsMonth.toLocaleString()}
          </div>
          <div className="mt-1.5 text-xs text-[var(--accent2)]">▼ Action required</div>
          <div className="mt-3 flex items-end gap-0.5" style={{ height: 36 }}>
            {[60, 80, 70, 90, 65, 75, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${h}%`,
                  background: i === 6 ? "var(--accent2)" : "#fed7d7",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card panel-strong">
          <div className="mb-4 text-sm font-bold text-[var(--text)]">Recent Activity</div>
          <div className="space-y-2">
            {activities.map((a, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-3"
              >
                <div
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: a.color }}
                />
                <div>
                  <div className="text-[13px] font-semibold text-[var(--text)]">
                    {a.title}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--text-dim)]">{a.sub}</div>
                </div>
              </div>
            ))}
            {!loading && activities.length === 0 && (
              <div className="rounded-lg border border-[var(--border)] p-3 text-xs text-[var(--text-dim)]">
                No recent activity yet.
              </div>
            )}
          </div>
        </div>
        <div className="card panel-strong">
          <div className="mb-4 text-sm font-bold text-[var(--text)]">Production Lines</div>
          <div className="space-y-2">
            {lines.map((line, i) => (
              <div
                key={`${line.name}-${i}`}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-3"
              >
                <div>
                  <div className="text-[13px] font-semibold text-[var(--text)]">
                    {line.name} — {line.label}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--text-dim)]">
                    {line.efficiency > 0 ? `${line.efficiency.toFixed(0)}% efficiency · ${line.qcFails} QC fails` : "—"}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${
                    line.status === "RUNNING"
                      ? "border-[#bbf7d0] bg-[var(--accent3-light)] text-[var(--accent3)]"
                      : line.status === "MAINTENANCE"
                      ? "border-[#fde68a] bg-[var(--amber-light)] text-[var(--amber)]"
                      : "border-[var(--border)] bg-[var(--bg2)] text-[var(--text-dim)]"
                  }`}
                >
                  {line.status === "RUNNING" ? "● Running" : line.status === "MAINTENANCE" ? "⚙ Maintenance" : "Stopped"}
                </span>
              </div>
            ))}
            {!loading && lines.length === 0 && (
              <div className="rounded-lg border border-[var(--border)] p-3 text-xs text-[var(--text-dim)]">
                No production line data found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
