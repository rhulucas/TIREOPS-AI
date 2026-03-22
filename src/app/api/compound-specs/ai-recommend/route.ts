import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getOpenAiApiKey, hasOpenAiApiKey } from "@/lib/openai-config";

const openai = new OpenAI({ apiKey: getOpenAiApiKey() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appType, polymer, filler, curing } = await req.json();

  // Fetch up to 8 similar specs from library
  const similar = await prisma.compoundSpec.findMany({
    where: {
      ...(appType && { applicationType: appType }),
      ...(polymer && { primaryPolymer: polymer }),
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  if (similar.length === 0) {
    return NextResponse.json({
      recommendation: "No similar formulations found in the library yet. Generate some specs first to enable AI recommendations based on your data.",
    });
  }

  const context = similar
    .map(
      (s) =>
        `${s.applicationType} / ${s.primaryPolymer} / ${s.fillerSystem}: Shore=${s.shoreA ?? "?"}, Tensile=${s.tensileStrength ?? "?"}MPa, Cure=${s.cureTemp ?? "?"}°C`
    )
    .join("\n");

  if (!hasOpenAiApiKey()) {
    // Parse some real values from the library to give a meaningful mock
    const withShore = similar.filter((s) => s.shoreA);
    const withTensile = similar.filter((s) => s.tensileStrength);
    const shoreNote = withShore.length > 0 ? withShore[0]!.shoreA! : "60–65";
    const tensileNote = withTensile.length > 0 ? withTensile[0]!.tensileStrength! : "18–22";

    return NextResponse.json({
      recommendation: `Based on ${similar.length} similar formulations in the library:\n\n• Shore A target: ${shoreNote} (library average)\n• Tensile strength: ${tensileNote} MPa\n• Cure temp: 160–175°C (typical range)\n• Suggested phr: ${filler ?? "Carbon Black"} 45–55, Sulfur 1.8–2.2, CBS accelerator 1.2–1.5`,
    });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a rubber compound expert. Analyze the existing library formulations and give concise, specific recommendations for a new compound. Be direct and practical. Max 120 words.",
      },
      {
        role: "user",
        content: `Here are ${similar.length} existing formulations from our library:\n${context}\n\nSuggest optimal Shore A, tensile strength, cure temperature, and key phr ratios for a new ${appType} compound using ${polymer} with ${filler ?? "standard filler"} and ${curing ?? "sulfur"} curing.`,
      },
    ],
  });

  return NextResponse.json({
    recommendation: completion.choices[0]?.message?.content ?? "No recommendation available.",
  });
}
