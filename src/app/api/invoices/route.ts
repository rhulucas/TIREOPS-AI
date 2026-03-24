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
            { invoiceNumber: { contains: q, mode: "insensitive" as const } },
            { customerName: { contains: q, mode: "insensitive" as const } },
            { orderRef: { contains: q, mode: "insensitive" as const } },
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
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { customer: true },
    }),
    prisma.invoice.count({ where }),
  ]);
  return NextResponse.json({ invoices, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const {
      invoiceNumber,
      customerId,
      customerName,
      customerAddress,
      orderRef,
      orderId,
      items,
      paymentTerms,
      taxRate,
      preview,
    } = body;
    if (!invoiceNumber || !customerName || !customerAddress || !items) {
      return NextResponse.json(
        { error: "invoiceNumber, customerName, customerAddress, items required" },
        { status: 400 }
      );
    }
    const userId = (session.user as { id?: string }).id || null;
    const invoiceData = {
      invoiceNumber: String(invoiceNumber),
      customerId: customerId || null,
      customerName: String(customerName),
      customerAddress: String(customerAddress),
      orderRef: orderRef ? String(orderRef) : null,
      orderId: orderId || null,
      items: typeof items === "string" ? items : JSON.stringify(items),
      paymentTerms: paymentTerms || "Net 30",
      taxRate: Number(taxRate) || 0,
      preview: preview ? String(preview) : null,
      status: "DRAFT",
      userId,
    };

    const tryCreate = (data: typeof invoiceData) =>
      prisma.invoice.create({ data }).catch(async (err) => {
        if (err?.code === "P2003") return prisma.invoice.create({ data: { ...data, userId: null } });
        throw err;
      });

    const invoice = orderId
      ? await prisma.invoice.upsert({
          where: { orderId: String(orderId) },
          update: { ...invoiceData },
          create: { ...invoiceData },
        }).catch(async (err) => {
          if (err?.code === "P2003") {
            return prisma.invoice.upsert({
              where: { orderId: String(orderId) },
              update: { ...invoiceData, userId: null },
              create: { ...invoiceData, userId: null },
            });
          }
          throw err;
        })
      : await tryCreate(invoiceData);

    return NextResponse.json({ invoice });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
