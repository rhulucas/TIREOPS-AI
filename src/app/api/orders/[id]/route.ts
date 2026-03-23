import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const STATUSES = ["PENDING", "URGENT", "PRODUCTION", "QC_CHECK", "SHIPPED", "DELIVERED"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const { status, customerId, customerName, tireSpec, quantity, value, dueDate, trackingNumber, shippedAt, deliveredAt } = body;
    const data: Prisma.OrderUncheckedUpdateInput = {};
    if (status && STATUSES.includes(status)) {
      data.status = status;
      if (status === "SHIPPED" && !shippedAt) data.shippedAt = new Date();
      if (status === "DELIVERED" && !deliveredAt) data.deliveredAt = new Date();
    }
    if (customerId !== undefined) data.customerId = customerId || null;
    if (customerName !== undefined) data.customerName = customerName?.trim() || null;
    if (tireSpec !== undefined) data.tireSpec = tireSpec?.trim() || null;
    if (quantity !== undefined) data.quantity = Number(quantity) || 0;
    if (value !== undefined) data.value = value != null ? Number(value) : null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (trackingNumber !== undefined) data.trackingNumber = trackingNumber?.trim() || null;
    if (shippedAt !== undefined) data.shippedAt = shippedAt ? new Date(shippedAt) : null;
    if (deliveredAt !== undefined) data.deliveredAt = deliveredAt ? new Date(deliveredAt) : null;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }
    const order = await prisma.order.update({
      where: { id },
      data,
    });
    return NextResponse.json({ order });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
