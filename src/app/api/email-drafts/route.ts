import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q") || "";
  const sortParam = req.nextUrl.searchParams.get("sort") || "";
  const page = Math.max(Number(req.nextUrl.searchParams.get("page") || 1), 1);
  const pageSize = Math.min(Math.max(Number(req.nextUrl.searchParams.get("pageSize") || 20), 1), 100);
  const year = req.nextUrl.searchParams.get("year") || "";
  const where = q
    ? {
        OR: [
          { inquiryType: { contains: q, mode: "insensitive" as const } },
          { emailText: { contains: q, mode: "insensitive" as const } },
          { result: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  if (year && year !== "all") {
    Object.assign(where, {
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`),
      },
    });
  }
  const [drafts, total] = await Promise.all([
    prisma.emailDraft.findMany({
      where,
      ...(sortParam === "oldest"
        ? { orderBy: { createdAt: "asc" as const } }
        : sortParam === "newest"
          ? { orderBy: { createdAt: "desc" as const } }
          : {}),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.emailDraft.count({ where }),
  ]);
  return NextResponse.json({ drafts, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const inquiryType = String(body.inquiryType || "").trim();
    const emailText = String(body.emailText || "").trim();
    const tone = body.tone ? String(body.tone) : null;
    const result = body.result ? String(body.result) : null;

    if (!inquiryType || !result) {
      return NextResponse.json({ error: "inquiryType and result are required" }, { status: 400 });
    }

    const draft = await prisma.emailDraft.create({
      data: {
        inquiryType,
        emailText,
        tone,
        result,
        userId: (session.user as { id?: string }).id || null,
      },
    });

    return NextResponse.json({ draft });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
