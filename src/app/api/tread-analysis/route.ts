import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withRateLimit } from "@/lib/api-utils";
import { getOpenAiApiKey, hasOpenAiApiKey } from "@/lib/openai-config";

const openai = new OpenAI({ apiKey: getOpenAiApiKey() });

async function treadHandler(req: NextRequest) {
  try {
    const { elements } = await req.json();
    const desc = Array.isArray(elements) ? elements.join(", ") : "tread design elements";
    if (!hasOpenAiApiKey()) {
      return NextResponse.json({
        result: `[Mock Analysis] Elements: ${desc}\nWet grip: B | Noise: 72dB | Rolling resistance: C\nUse Export button for Mold CNC specs.`,
      });
    }
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a tire tread design expert. Based on the design elements (grooves, blocks, sipes, dimples), analyze and predict:
1. Wet grip grade (EU label A-E)
2. Rolling noise (dB)
3. Rolling resistance grade
4. Mold CNC spec recommendations (brief)`,
        },
        { role: "user", content: `Design elements: ${desc}. Perform AI analysis.` },
      ],
    });
    const result = completion.choices[0]?.message?.content || "No output";
    return NextResponse.json({ result });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: String(e), result: "AI call failed" },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(treadHandler);
