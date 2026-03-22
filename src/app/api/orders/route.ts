import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q") || "";
  const customerId = req.nextUrl.searchParams.get("customerId") || "";
  const take = Number(req.nextUrl.searchParams.get("take") || req.nextUrl.searchParams.get("pageSize") || 25);
  const page = Number(req.nextUrl.searchParams.get("page") || 1);
  const status = req.nextUrl.searchParams.get("status") || "";
  const year = req.nextUrl.searchParams.get("year") || "";
  const sortParam = req.nextUrl.searchParams.get("sort") || "";
  const pageSize = Number.isFinite(take) ? Math.min(Math.max(take, 1), 200) : 25;
  const skip = (Math.max(page, 1) - 1) * pageSize;

  const where = {
    ...(customerId ? { customerId } : {}),
    ...(status && status !== "all"
      ? { status: status === "COMPLETE" ? "SHIPPED" : status }
      : {}),
    ...(year && year !== "all"
      ? {
          createdAt: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lt: new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" as const } },
            { customerName: { contains: q, mode: "insensitive" as const } },
            { tireSpec: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      ...(sortParam === "oldest"
        ? { orderBy: { createdAt: "asc" as const } }
        : sortParam === "newest"
          ? { orderBy: { createdAt: "desc" as const } }
          : {}),
      skip,
      take: pageSize,
      include: { customer: true },
    }),
    prisma.order.count({ where }),
  ]);
  return NextResponse.json({ orders, total, page: Math.max(page, 1), pageSize });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const { orderNumber, customerId, customerName, tireSpec, quantity, value, dueDate } = body;
    if (!orderNumber?.trim() || !tireSpec?.trim() || quantity == null) {
      return NextResponse.json(
        { error: "orderNumber, tireSpec, quantity required" },
        { status: 400 }
      );
    }
    const order = await prisma.order.create({
      data: {
        orderNumber: String(orderNumber).trim(),
        status: "PENDING",
        customerId: customerId || null,
        customerName: customerName?.trim() || null,
        tireSpec: String(tireSpec).trim(),
        quantity: Number(quantity) || 0,
        value: value != null ? Number(value) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        userId: (session.user as { id?: string }).id || null,
      },
    });
    return NextResponse.json({ order });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
