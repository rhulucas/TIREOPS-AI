import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const design = await prisma.treadDesign.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      changeRequests: {
        orderBy: { createdAt: "desc" },
        include: {
          requester: { select: { name: true, email: true, role: true } },
          reviewer: { select: { name: true } },
        },
      },
    },
  });
  if (!design) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ design });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const {
    name, category, season, status, application,
    widthMm, heightMm, grooveDepthMm,
    noiseRating, wetGripRating, rollingResistance,
    notes, moldSpec,
  } = body;
  try {
    const design = await prisma.treadDesign.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(season !== undefined && { season }),
        ...(status !== undefined && { status }),
        ...(application !== undefined && { application }),
        ...(widthMm !== undefined && { widthMm: Number(widthMm) }),
        ...(heightMm !== undefined && { heightMm: Number(heightMm) }),
        ...(grooveDepthMm !== undefined && { grooveDepthMm: Number(grooveDepthMm) }),
        ...(noiseRating !== undefined && { noiseRating }),
        ...(wetGripRating !== undefined && { wetGripRating }),
        ...(rollingResistance !== undefined && { rollingResistance }),
        ...(notes !== undefined && { notes }),
        ...(moldSpec !== undefined && { moldSpec }),
      },
    });
    return NextResponse.json({ design });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
