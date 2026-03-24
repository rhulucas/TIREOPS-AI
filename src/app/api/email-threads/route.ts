import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") || "";
  const status = req.nextUrl.searchParams.get("status") || "all";
  const sort = req.nextUrl.searchParams.get("sort") || "newest";
  const year = req.nextUrl.searchParams.get("year") || "all";
  const page = Math.max(Number(req.nextUrl.searchParams.get("page") || 1), 1);
  const pageSize = Math.min(Number(req.nextUrl.searchParams.get("pageSize") || 30), 100);

  const where = {
    ...(status !== "all" ? { status } : {}),
    ...(year !== "all" ? {
      updatedAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`),
      },
    } : {}),
    ...(q ? {
      OR: [
        { customerName: { contains: q, mode: "insensitive" as const } },
        { subject: { contains: q, mode: "insensitive" as const } },
        { tireSpec: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const orderBy = sort === "oldest"
    ? { updatedAt: "asc" as const }
    : { updatedAt: "desc" as const };

  const [threads, total] = await Promise.all([
    prisma.emailThread.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { messages: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.emailThread.count({ where }),
  ]);

  return NextResponse.json({ threads, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const { subject, customerName, customerEmail, quoteId, tireSpec, quantity, unitPrice, invoiceTotal, initialMessage } = body;
    if (!subject || !customerName || !initialMessage) {
      return NextResponse.json({ error: "subject, customerName, initialMessage required" }, { status: 400 });
    }
    const threadData = {
      subject,
      customerName,
      customerEmail: customerEmail || null,
      quoteId: quoteId || null,
      tireSpec: tireSpec || null,
      quantity: quantity ? Number(quantity) : null,
      unitPrice: unitPrice ? Number(unitPrice) : invoiceTotal ? Number(invoiceTotal) : null,
      status: "OPEN",
      userId: (session.user as { id?: string }).id || null,
      messages: {
        create: {
          sender: "sales" as const,
          content: initialMessage,
        },
      },
    };
    const thread = await prisma.emailThread.create({ data: threadData, include: { messages: true } }).catch(async (err) => {
      if (err?.code === "P2003") {
        return prisma.emailThread.create({ data: { ...threadData, userId: null }, include: { messages: true } });
      }
      throw err;
    });
    return NextResponse.json({ thread });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
