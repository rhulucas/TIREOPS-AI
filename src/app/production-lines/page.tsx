import { redirect } from "next/navigation";
import { Activity, AlertTriangle, Gauge, PackageCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function statusBadge(status: string) {
  if (status === "RUNNING") return "badge-green";
  if (status === "MAINTENANCE") return "badge-amber";
  return "badge-neutral";
}

function lineType(name: string) {
  if (name.endsWith("A") || name.endsWith("E") || name.endsWith("I")) return "Passenger Car";
  if (name.endsWith("B") || name.endsWith("F") || name.endsWith("J")) return "SUV / Light Truck";
  if (name.endsWith("C") || name.endsWith("G") || name.endsWith("K")) return "Truck / OTR";
  return "High Performance";
}

function qcRisk(qcFails: number, efficiency: number) {
  if (qcFails >= 14 || efficiency < 85) return { label: "High", className: "badge-red" };
  if (qcFails >= 8 || efficiency < 90) return { label: "Watch", className: "badge-amber" };
  return { label: "Normal", className: "badge-green" };
}

export default async function ProductionLinesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/production-lines");

  const [lines, orderCounts, urgentOrders] = await Promise.all([
    prisma.productionLine.findMany({ orderBy: { name: "asc" } }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { status: true },
      where: { status: { in: ["URGENT", "PENDING", "PRODUCTION", "QC_CHECK"] } },
    }),
    prisma.order.findMany({
      where: { status: { in: ["URGENT", "PRODUCTION", "QC_CHECK"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { customer: true },
    }),
  ]);

  const running = lines.filter((line) => line.status === "RUNNING").length;
  const maintenance = lines.filter((line) => line.status === "MAINTENANCE").length;
  const totalQcFails = lines.reduce((sum, line) => sum + line.qcFails, 0);
  const avgEfficiency =
    lines.reduce((sum, line) => sum + line.efficiency, 0) / Math.max(1, lines.length);
  const activeOrders = orderCounts.reduce((sum, row) => sum + row._count.status, 0);

  const kpis = [
    {
      label: "Running Lines",
      value: `${running}/${lines.length}`,
      sub: `${maintenance} in maintenance`,
      icon: Activity,
      color: "text-[var(--accent3)]",
    },
    {
      label: "Avg Efficiency",
      value: `${avgEfficiency.toFixed(1)}%`,
      sub: "Across all production lines",
      icon: Gauge,
      color: "text-[var(--accent)]",
    },
    {
      label: "QC Failures",
      value: totalQcFails.toLocaleString(),
      sub: "Current simulated month",
      icon: AlertTriangle,
      color: "text-[var(--amber)]",
    },
    {
      label: "Active Orders",
      value: activeOrders.toLocaleString(),
      sub: "Urgent, pending, production, QC",
      icon: PackageCheck,
      color: "text-[var(--accent2)]",
    },
  ];

  return (
    <div className="page-shell space-y-5">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">
          Manufacturing Execution
        </div>
        <h1 className="mt-1 text-[30px] font-bold tracking-tight text-[var(--text)]">
          Production Lines
        </h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">
          Live simulated factory line status, throughput health, and QC workload from PostgreSQL.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="kpi-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-dim)]">{kpi.label}</div>
                  <div className={`mt-2 text-[30px] font-bold leading-none ${kpi.color}`}>
                    {kpi.value}
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-dim)]">{kpi.sub}</div>
                </div>
                <div className="rounded-[10px] bg-[var(--bg2)] p-3">
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="card panel-strong">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Line Health</h2>
              <p className="mt-1 text-sm text-[var(--text-dim)]">
                Engineering view of simulated manufacturing line conditions.
              </p>
            </div>
            <span className="badge-blue">{lines.length} lines</span>
          </div>

          <div className="overflow-hidden rounded-[10px] border border-[var(--border)]">
            <table className="table-demo min-w-full">
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Efficiency</th>
                  <th>QC Fails</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const risk = qcRisk(line.qcFails, line.efficiency);
                  return (
                    <tr key={line.id}>
                      <td className="font-semibold">{line.name}</td>
                      <td>{lineType(line.name)}</td>
                      <td>
                        <span className={statusBadge(line.status)}>{line.status}</span>
                      </td>
                      <td>
                        <div className="flex min-w-[150px] items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-[var(--bg3)]">
                            <div
                              className="h-2 rounded-full bg-[var(--accent)]"
                              style={{ width: `${Math.min(line.efficiency, 100)}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs font-semibold">
                            {line.efficiency.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td>{line.qcFails}</td>
                      <td>
                        <span className={risk.className}>{risk.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card panel-strong">
            <h2 className="text-lg font-bold text-[var(--text)]">Active Workload</h2>
            <p className="mt-1 text-sm text-[var(--text-dim)]">
              Current production-stage orders by status.
            </p>
            <div className="mt-4 space-y-2">
              {["URGENT", "PENDING", "PRODUCTION", "QC_CHECK"].map((status) => {
                const count = orderCounts.find((row) => row.status === status)?._count.status ?? 0;
                const width = activeOrders ? Math.max(8, (count / activeOrders) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="mb-1 flex justify-between text-xs font-semibold text-[var(--text-mid)]">
                      <span>{status.replace("_", " ")}</span>
                      <span>{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg3)]">
                      <div
                        className="h-2 rounded-full bg-[var(--accent)]"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card panel-strong">
            <h2 className="text-lg font-bold text-[var(--text)]">Priority Orders</h2>
            <p className="mt-1 text-sm text-[var(--text-dim)]">
              Orders most relevant to production and QC review.
            </p>
            <div className="mt-4 space-y-2">
              {urgentOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-[9px] border border-[var(--border)] bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-[var(--text)]">{order.orderNumber}</div>
                    <span className={order.status === "URGENT" ? "badge-red" : "badge-blue"}>
                      {order.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-dim)]">
                    {order.customerName || order.customer?.company || order.customer?.name || "Unknown customer"}
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-mid)]">
                    {order.tireSpec || "TBD"} · {order.quantity.toLocaleString()} units
                  </div>
                </div>
              ))}
              {urgentOrders.length === 0 && (
                <div className="rounded-[9px] border border-[var(--border)] p-3 text-sm text-[var(--text-dim)]">
                  No priority production orders yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
