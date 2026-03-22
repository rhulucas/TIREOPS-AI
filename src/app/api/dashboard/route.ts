import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function timeAgo(input: Date) {
  const diffMs = Date.now() - input.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function lineLabel(name: string) {
  if (name.endsWith("A") || name.endsWith("E") || name.endsWith("I")) return "Passenger Car";
  if (name.endsWith("B") || name.endsWith("F") || name.endsWith("J")) return "SUV / Light Truck";
  if (name.endsWith("C") || name.endsWith("G") || name.endsWith("K")) return "Truck / OTR";
  return "High Performance";
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const weekStart = addDays(today, -6);
  const prevWeekStart = addDays(weekStart, -7);

  const [
    quoteAggWeek,
    quoteAggPrevWeek,
    openOrders,
    ordersAddedToday,
    lineRows,
    recentQuotes,
    recentInvoices,
    recentTreads,
    recentCompounds,
  ] = await Promise.all([
    prisma.quote.aggregate({
      _sum: { quantity: true },
      where: { createdAt: { gte: weekStart, lt: tomorrow } },
    }),
    prisma.quote.aggregate({
      _sum: { quantity: true },
      where: { createdAt: { gte: prevWeekStart, lt: weekStart } },
    }),
    prisma.order.count({
      where: { status: { in: ["PENDING", "PRODUCTION", "QC_CHECK", "URGENT"] } },
    }),
    prisma.order.count({
      where: { createdAt: { gte: today, lt: tomorrow } },
    }),
    prisma.productionLine.findMany({ orderBy: { name: "asc" } }),
    prisma.quote.findMany({
      orderBy: { createdAt: "desc" },
      take: 2,
      include: { customer: true },
    }),
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 2,
      include: { customer: true },
    }),
    prisma.treadDesign.findMany({
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
    prisma.compoundSpec.findMany({
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
  ]);

  const unitsQuotedWeek = quoteAggWeek._sum.quantity ?? 0;
  const unitsQuotedPrevWeek = quoteAggPrevWeek._sum.quantity ?? 0;
  const unitsQuotedDelta =
    unitsQuotedPrevWeek > 0
      ? Math.round(((unitsQuotedWeek - unitsQuotedPrevWeek) / unitsQuotedPrevWeek) * 100)
      : unitsQuotedWeek > 0
        ? 100
        : 0;

  const totalQcFailsMonth = lineRows.reduce((sum, line) => sum + line.qcFails, 0);
  const runningLines = lineRows.filter((line) => line.status === "RUNNING");
  const avgEfficiency =
    runningLines.reduce((sum, line) => sum + line.efficiency, 0) / Math.max(1, runningLines.length);

  const recentActivity = [
    ...recentQuotes.map((quote) => ({
      color: "var(--accent)",
      title: `Quote for ${quote.size} generated`,
      sub: `${quote.customerName || quote.customer?.company || quote.customer?.name || "Unknown customer"} · Qty ${quote.quantity ?? "—"} · ${timeAgo(new Date(quote.createdAt))}`,
      createdAt: quote.createdAt.toISOString(),
    })),
    ...recentInvoices.map((invoice) => ({
      color: "var(--amber)",
      title: `Invoice ${invoice.invoiceNumber} prepared`,
      sub: `${invoice.customerName} · ${invoice.orderRef || "No order ref"} · ${timeAgo(new Date(invoice.createdAt))}`,
      createdAt: invoice.createdAt.toISOString(),
    })),
    ...recentTreads.map((tread) => ({
      color: "var(--accent3)",
      title: `Tread ${tread.name || "unnamed"} updated`,
      sub: `${tread.application || "General"} · ${timeAgo(new Date(tread.createdAt))}`,
      createdAt: tread.createdAt.toISOString(),
    })),
    ...recentCompounds.map((compound) => ({
      color: "#7c3aed",
      title: `Compound spec for ${compound.applicationType} recorded`,
      sub: `${compound.primaryPolymer} / ${compound.fillerSystem} · ${timeAgo(new Date(compound.createdAt))}`,
      createdAt: compound.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return NextResponse.json({
    kpis: {
      unitsQuotedWeek,
      unitsQuotedDelta,
      openOrders,
      ordersAddedToday,
      avgEfficiency: Number(avgEfficiency.toFixed(1)),
      totalQcFailsMonth,
    },
    productionLines: lineRows.map((line) => ({
      name: line.name,
      label: lineLabel(line.name),
      status: line.status,
      efficiency: line.efficiency,
      qcFails: line.qcFails,
    })),
    recentActivity,
  });
}
