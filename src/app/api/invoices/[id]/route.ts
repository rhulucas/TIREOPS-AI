import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, order: true },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ invoice });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const { status } = body;
    const data: Record<string, unknown> = {};
    if (status === "PAID") {
      data.status = "PAID";
      data.paidAt = new Date();
    } else if (status === "SENT") {
      data.status = "SENT";
    } else if (status === "DRAFT") {
      data.status = "DRAFT";
    }
    const invoice = await prisma.invoice.update({ where: { id }, data });
    return NextResponse.json({ invoice });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
