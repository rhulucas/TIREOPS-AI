import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import OpenAI from "openai";
import { getOpenAiApiKey, hasOpenAiApiKey } from "@/lib/openai-config";

const openai = new OpenAI({ apiKey: getOpenAiApiKey() });

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id?: string }).id;
  const status = req.nextUrl.searchParams.get("status") || "";

  // ADMIN sees all; ENGINEER sees only their own
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (role !== "ADMIN") where.requesterId = userId;

  const requests = await prisma.changeRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      design: { select: { id: true, name: true, category: true, season: true } },
      requester: { select: { name: true, email: true } },
      reviewer: { select: { name: true } },
    },
  });
  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "ENGINEER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Only engineers can submit change requests" }, { status: 403 });
  }

  const userId = (session.user as { id?: string }).id!;
  const { designId, type, description, proposedChanges } = await req.json();

  if (!designId || !type || !description) {
    return NextResponse.json({ error: "designId, type, description are required" }, { status: 400 });
  }

  // Fetch the current design + similar designs for AI assessment
  const design = await prisma.treadDesign.findUnique({
    where: { id: designId },
    select: { name: true, category: true, season: true, grooveDepthMm: true, noiseRating: true, wetGripRating: true, rollingResistance: true },
  });

  const similarHistory = await prisma.changeRequest.findMany({
    where: { type, status: { in: ["APPROVED", "REJECTED"] } },
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { type: true, status: true, description: true, reviewNote: true },
  });

  let aiAssessment = "";
  if (hasOpenAiApiKey() && design) {
    try {
      const historyContext =
        similarHistory.length > 0
          ? similarHistory.map((h) => `${h.type} → ${h.status}: "${h.description}" (review: ${h.reviewNote ?? "—"})`).join("\n")
          : "No similar historical requests found.";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a senior tire engineering reviewer. Assess change requests for technical risk and approval likelihood. Be concise (max 100 words). State risk level (Low/Medium/High) and a brief recommendation.`,
          },
          {
            role: "user",
            content: `Design: ${design.name} (${design.category} ${design.season})\nCurrent specs: groove=${design.grooveDepthMm}mm, noise=${design.noiseRating}, wetGrip=${design.wetGripRating}, RR=${design.rollingResistance}\n\nChange request (${type}): ${description}\nProposed changes: ${JSON.stringify(proposedChanges)}\n\nSimilar historical requests:\n${historyContext}\n\nProvide AI assessment.`,
          },
        ],
      });
      aiAssessment = completion.choices[0]?.message?.content ?? "";
    } catch {
      aiAssessment = "AI assessment unavailable.";
    }
  } else if (design) {
    aiAssessment = `[Mock] ${type} request for ${design.name}. Based on ${similarHistory.length} similar historical requests. Risk: Medium. Recommend review against test data before approval.`;
  }

  const request = await prisma.changeRequest.create({
    data: {
      designId,
      requesterId: userId,
      type,
      description,
      proposedChanges: typeof proposedChanges === "string" ? proposedChanges : JSON.stringify(proposedChanges ?? {}),
      aiAssessment,
    },
    include: {
      design: { select: { id: true, name: true, category: true, season: true } },
      requester: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ request });
}
