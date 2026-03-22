import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q") || "";
  const customerId = req.nextUrl.searchParams.get("customerId") || "";
  const page = Math.max(Number(req.nextUrl.searchParams.get("page") || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.nextUrl.searchParams.get("pageSize") || 20), 1), 100);
  const year = req.nextUrl.searchParams.get("year") || "";
  const where = {
    ...(customerId ? { customerId } : {}),
    ...(q
      ? {
          OR: [
            { customerName: { contains: q, mode: "insensitive" as const } },
            { category: { contains: q, mode: "insensitive" as const } },
            { size: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  if (year && year !== "all") {
    Object.assign(where, {
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`),
      },
    });
  }
  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        customerName: true,
        category: true,
        size: true,
        quantity: true,
        createdAt: true,
        customerId: true,
      },
    }),
    prisma.quote.count({ where }),
  ]);
  return NextResponse.json({ quotes, total, page, pageSize });
}
