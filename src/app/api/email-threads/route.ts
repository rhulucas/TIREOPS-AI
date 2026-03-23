import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const threads = await prisma.emailThread.findMany({
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json({ threads });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const { subject, customerName, customerEmail, quoteId, tireSpec, quantity, unitPrice, initialMessage } = body;
    if (!subject || !customerName || !initialMessage) {
      return NextResponse.json({ error: "subject, customerName, initialMessage required" }, { status: 400 });
    }
    const thread = await prisma.emailThread.create({
      data: {
        subject,
        customerName,
        customerEmail: customerEmail || null,
        quoteId: quoteId || null,
        tireSpec: tireSpec || null,
        quantity: quantity ? Number(quantity) : null,
        unitPrice: unitPrice ? Number(unitPrice) : null,
        status: "OPEN",
        userId: (session.user as { id?: string }).id || null,
        messages: {
          create: {
            sender: "sales",
            content: initialMessage,
          },
        },
      },
      include: { messages: true },
    });
    return NextResponse.json({ thread });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
