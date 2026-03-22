import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getOpenAiApiKey, hasOpenAiApiKey } from "@/lib/openai-config";
import { withRateLimit } from "@/lib/api-utils";

const openai = new OpenAI({ apiKey: getOpenAiApiKey() });

async function handler(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { category, season, widthMm, heightMm } = await req.json();

  // Fetch similar designs from the database
  const similarDesigns = await prisma.treadDesign.findMany({
    where: {
      status: "ACTIVE",
      ...(category && { category }),
      ...(season && { season }),
    },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      name: true,
      category: true,
      season: true,
      widthMm: true,
      heightMm: true,
      grooveDepthMm: true,
      noiseRating: true,
      wetGripRating: true,
      rollingResistance: true,
    },
  });

  if (!hasOpenAiApiKey()) {
    const avgGroove =
      similarDesigns.length > 0
        ? (similarDesigns.reduce((s, d) => s + (d.grooveDepthMm ?? 8), 0) / similarDesigns.length).toFixed(1)
        : "8.5";
    return NextResponse.json({
      recommendation: `Based on ${similarDesigns.length} similar ${category} ${season} designs in the library:\n• Recommended groove depth: ~${avgGroove}mm\n• Typical noise rating: B\n• Wet grip target: A or B\n• Rolling resistance: B`,
    });
  }

  const context =
    similarDesigns.length > 0
      ? similarDesigns
          .map(
            (d) =>
              `${d.name}: groove=${d.grooveDepthMm ?? "?"}mm, noise=${d.noiseRating ?? "?"}, wetGrip=${d.wetGripRating ?? "?"}, RR=${d.rollingResistance ?? "?"}`
          )
          .join("\n")
      : "No similar designs found in library.";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a tire tread design engineer at an enterprise tire manufacturer.
Given existing designs from the company's library, recommend optimal parameters for a new design.
Be specific, concise, and reference the actual data. Use bullet points. Max 150 words.`,
      },
      {
        role: "user",
        content: `New design target: Category=${category}, Season=${season}, Size=${widthMm}/${heightMm}mm\n\nSimilar designs in library (${similarDesigns.length} found):\n${context}\n\nRecommend: groove depth, noise rating, wet grip rating, rolling resistance rating, and any design notes.`,
      },
    ],
  });

  return NextResponse.json({
    recommendation: completion.choices[0]?.message?.content ?? "No recommendation generated.",
    basedOn: similarDesigns.length,
  });
}

export const POST = withRateLimit(handler);
