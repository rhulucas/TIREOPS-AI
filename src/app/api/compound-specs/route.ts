import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") || "";
  const appType = req.nextUrl.searchParams.get("appType") || "";
  const polymer = req.nextUrl.searchParams.get("polymer") || "";

  const where: Record<string, unknown> = {};
  if (appType) where.applicationType = appType;
  if (polymer) where.primaryPolymer = polymer;
  if (q) {
    where.OR = [
      { applicationType: { contains: q, mode: "insensitive" } },
      { primaryPolymer: { contains: q, mode: "insensitive" } },
      { fillerSystem: { contains: q, mode: "insensitive" } },
    ];
  }

  const specs = await prisma.compoundSpec.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { user: { select: { name: true } } },
  });
  return NextResponse.json({ specs });
}
