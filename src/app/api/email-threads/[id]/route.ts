import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const thread = await prisma.emailThread.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ thread });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const { status, unitPrice, quantity } = body;
    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (unitPrice !== undefined) data.unitPrice = unitPrice ? Number(unitPrice) : null;
    if (quantity !== undefined) data.quantity = quantity ? Number(quantity) : null;
    const thread = await prisma.emailThread.update({ where: { id }, data });
    return NextResponse.json({ thread });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
