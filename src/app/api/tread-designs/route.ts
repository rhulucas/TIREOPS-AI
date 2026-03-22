import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") || "";
  const category = req.nextUrl.searchParams.get("category") || "";
  const season = req.nextUrl.searchParams.get("season") || "";
  const status = req.nextUrl.searchParams.get("status") || "";

  const where: Prisma.TreadDesignWhereInput = {
    ...(category && { category }),
    ...(season && { season }),
    ...(status && { status }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { application: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const designs = await prisma.treadDesign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      _count: { select: { changeRequests: true } },
      user: { select: { name: true } },
    },
  });
  return NextResponse.json({ designs });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const {
      name, category, season, status, application,
      widthMm, heightMm, grooveDepthMm,
      noiseRating, wetGripRating, rollingResistance,
      notes, moldSpec,
    } = body;
    const design = await prisma.treadDesign.create({
      data: {
        name: name || `Design ${new Date().toLocaleDateString()}`,
        category: category || "PCR",
        season: season || "ALL_SEASON",
        status: status || "DRAFT",
        application: application || null,
        widthMm: widthMm != null ? Number(widthMm) : null,
        heightMm: heightMm != null ? Number(heightMm) : null,
        grooveDepthMm: grooveDepthMm != null ? Number(grooveDepthMm) : null,
        noiseRating: noiseRating || null,
        wetGripRating: wetGripRating || null,
        rollingResistance: rollingResistance || null,
        notes: notes || null,
        moldSpec: moldSpec || null,
        userId: (session.user as { id?: string }).id || null,
      },
    });
    return NextResponse.json({ design });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
