import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

type InvoiceItem = {
  description?: string;
  quantity?: number;
  unitPrice?: number;
};

function inferFamily(spec: string) {
  const value = spec.toUpperCase();
  if (value.includes("TBR") || value.includes("11R") || value.includes("22.5")) return "Commercial Truck";
  if (value.includes("LT") || value.includes("SUV") || value.includes("70R18")) return "SUV / Light Truck";
  if (value.includes("UHP") || value.includes("PERFORMANCE")) return "Performance";
  return "Passenger Car";
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "asc" },
      },
      invoices: {
        orderBy: { createdAt: "asc" },
      },
      quotes: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const orders = customer.orders;
  const invoices = customer.invoices;
  const quotes = customer.quotes;
  const totalUnits = orders.reduce((sum, order) => sum + order.quantity, 0);
  const totalOrderValue = orders.reduce((sum, order) => sum + (order.value || 0), 0);
  const avgOrderValue = orders.length ? totalOrderValue / orders.length : 0;
  const activeSpecs = new Set(orders.map((order) => order.tireSpec).filter(Boolean)).size;
  const recentOrderDate = orders.length ? orders[orders.length - 1]!.createdAt : null;

  const gaps: number[] = [];
  for (let i = 1; i < orders.length; i += 1) {
    const previous = orders[i - 1]!.createdAt.getTime();
    const current = orders[i]!.createdAt.getTime();
    gaps.push(Math.round((current - previous) / 86400000));
  }
  const avgDaysBetweenOrders = gaps.length
    ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length)
    : null;
  const gapVariance = gaps.length
    ? gaps.reduce((sum, gap) => sum + Math.abs(gap - (avgDaysBetweenOrders || 0)), 0) / gaps.length
    : null;
  const predictedReorderDate =
    recentOrderDate && avgDaysBetweenOrders
      ? addDays(recentOrderDate, avgDaysBetweenOrders)
      : null;
  const reorderWindowDays =
    avgDaysBetweenOrders == null
      ? null
      : clamp(Math.round((gapVariance ?? avgDaysBetweenOrders * 0.25) || 14), 10, 45);
  const reorderWindowStart =
    predictedReorderDate && reorderWindowDays != null
      ? addDays(predictedReorderDate, -reorderWindowDays)
      : null;
  const reorderWindowEnd =
    predictedReorderDate && reorderWindowDays != null
      ? addDays(predictedReorderDate, reorderWindowDays)
      : null;

  const cadenceLabel =
    avgDaysBetweenOrders == null
      ? "Not enough history"
      : avgDaysBetweenOrders <= 21
        ? "Frequent buyer"
        : avgDaysBetweenOrders <= 60
          ? "Monthly / bi-monthly cadence"
          : "Project-based / ad hoc";

  const specMap = new Map<string, { spec: string; orders: number; units: number; revenue: number }>();
  for (const order of orders) {
    const spec = order.tireSpec || "Unknown spec";
    const bucket = specMap.get(spec) || { spec, orders: 0, units: 0, revenue: 0 };
    bucket.orders += 1;
    bucket.units += order.quantity;
    bucket.revenue += order.value || 0;
    specMap.set(spec, bucket);
  }
  const topSpecs = [...specMap.values()]
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  const familyMap = new Map<string, { family: string; units: number; revenue: number }>();
  for (const order of orders) {
    const family = inferFamily(order.tireSpec || "");
    const bucket = familyMap.get(family) || { family, units: 0, revenue: 0 };
    bucket.units += order.quantity;
    bucket.revenue += order.value || 0;
    familyMap.set(family, bucket);
  }
  for (const invoice of invoices) {
    try {
      const items = JSON.parse(invoice.items) as InvoiceItem[];
      for (const item of items) {
        const family = inferFamily(item.description || "");
        const bucket = familyMap.get(family) || { family, units: 0, revenue: 0 };
        bucket.units += Number(item.quantity) || 0;
        bucket.revenue += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
        familyMap.set(family, bucket);
      }
    } catch {
      // Ignore malformed historical invoice items.
    }
  }
  const familyMix = [...familyMap.values()].sort((a, b) => b.units - a.units);

  const monthlyMap = new Map<string, { month: string; orders: number; units: number; revenue: number }>();
  for (const order of orders) {
    const month = monthKey(order.createdAt);
    const bucket = monthlyMap.get(month) || { month, orders: 0, units: 0, revenue: 0 };
    bucket.orders += 1;
    bucket.units += order.quantity;
    bucket.revenue += order.value || 0;
    monthlyMap.set(month, bucket);
  }
  const monthlyTrend = [...monthlyMap.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  const now = new Date();
  const daysSinceLastOrder = recentOrderDate
    ? Math.round((now.getTime() - recentOrderDate.getTime()) / 86400000)
    : null;
  const confidenceScore = avgDaysBetweenOrders == null
    ? 0
    : clamp(
        (orders.length >= 6 ? 0.45 : orders.length >= 3 ? 0.3 : 0.15) +
          ((gapVariance ?? avgDaysBetweenOrders) <= Math.max(avgDaysBetweenOrders * 0.35, 21) ? 0.35 : 0.15) +
          (daysSinceLastOrder != null && daysSinceLastOrder >= Math.max(avgDaysBetweenOrders - 21, 0) ? 0.2 : 0.05),
        0,
        0.95
      );
  const confidence =
    confidenceScore >= 0.72 ? "High" : confidenceScore >= 0.48 ? "Medium" : "Low";
  const likelySpecs = topSpecs.slice(0, 3).map((spec) => spec.spec);
  const suggestedAction =
    avgDaysBetweenOrders == null
      ? "Need more order history before assigning a follow-up task."
      : daysSinceLastOrder != null && daysSinceLastOrder > avgDaysBetweenOrders + 21
        ? "Customer is past the usual reorder cycle. Sales should follow up now and confirm current stock levels."
        : daysSinceLastOrder != null && daysSinceLastOrder >= Math.max(avgDaysBetweenOrders - 14, 0)
          ? "Customer is entering the expected reorder window. Prepare pricing, availability, and outreach this week."
          : "No immediate outreach required. Monitor account and prepare the next recommended specs for the next cycle.";

  const demandSignals = [
    topSpecs[0] ? `Most-used spec: ${topSpecs[0].spec} (${topSpecs[0].units.toLocaleString()} units).` : "No dominant tire spec yet.",
    familyMix[0] ? `Primary demand family: ${familyMix[0].family}.` : "No tire family pattern detected.",
    predictedReorderDate ? `Likely next reorder around ${predictedReorderDate.toLocaleDateString()}.` : "Need more order history to estimate reorder timing.",
  ];

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    },
    summary: {
      totalOrders: orders.length,
      totalInvoices: invoices.length,
      totalQuotes: quotes.length,
      totalUnits,
      totalOrderValue,
      avgOrderValue,
      activeSpecs,
      avgDaysBetweenOrders,
      recentOrderDate: recentOrderDate?.toISOString() || null,
      predictedReorderDate: predictedReorderDate?.toISOString() || null,
      cadenceLabel,
    },
    topSpecs,
    familyMix,
    monthlyTrend,
    demandSignals,
    reorderGuidance: {
      expectedWindowStart: reorderWindowStart?.toISOString() || null,
      expectedWindowEnd: reorderWindowEnd?.toISOString() || null,
      confidence,
      suggestedAction,
      likelySpecs,
      daysSinceLastOrder,
    },
  });
}
