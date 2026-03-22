import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/api-utils";
import { getOpenAiApiKey, hasOpenAiApiKey } from "@/lib/openai-config";

const openai = new OpenAI({ apiKey: getOpenAiApiKey() });

async function compoundHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      applicationType,
      primaryPolymer,
      fillerSystem,
      shoreA,
      tensileStrength,
      curingSystem,
      cureTemp,
      notes,
      polymers,
      fillers,
      vulcanization,
    } = body;
    const p = primaryPolymer || (Array.isArray(polymers) ? polymers.join(", ") : "SBR");
    const f = fillerSystem || (Array.isArray(fillers) ? fillers.join(", ") : "Carbon Black N330");
    const v = curingSystem || (Array.isArray(vulcanization) ? vulcanization.join(", ") : "Sulfur");
    const summary = `Application: ${applicationType || "—"}, Polymer: ${p}, Filler: ${f}, Curing: ${v}, Shore A: ${shoreA || "—"}, Tensile: ${tensileStrength || "—"} MPa, Cure temp: ${cureTemp || "—"}°C. Notes: ${notes || "—"}`;
    if (!hasOpenAiApiKey()) {
      const mockResult = `${summary}\n\nSample phr:\n- Rubber 100\n- Carbon black 50\n- Sulfur 2\n- Accelerator 1.5\n\nEU prediction: Wet B | Resistance C | Noise 72dB`;
      const session = await auth();
      if (session?.user) {
        await prisma.compoundSpec.create({
          data: {
            applicationType: applicationType || "Standard",
            primaryPolymer: p,
            fillerSystem: f,
            shoreA: shoreA || null,
            tensileStrength: tensileStrength || null,
            curingSystem: v,
            cureTemp: cureTemp || null,
            notes: notes || null,
            result: mockResult,
            userId: (session.user as { id?: string }).id || null,
          },
        });
      }
      return NextResponse.json({ result: mockResult });
    }
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a rubber compound expert. Based on the parameters provided, output a detailed rubber formulation with ingredient ratios (phr), cure conditions, and predicted EU label grades (wet grip, rolling resistance, noise). Use clear formatting.`,
        },
        {
          role: "user",
          content: summary,
        },
      ],
    });
    const result = completion.choices[0]?.message?.content || "No output";
    const session = await auth();
    if (session?.user) {
      await prisma.compoundSpec.create({
        data: {
          applicationType: applicationType || "Standard",
          primaryPolymer: p,
          fillerSystem: f,
          shoreA: shoreA || null,
          tensileStrength: tensileStrength || null,
          curingSystem: v,
          cureTemp: cureTemp || null,
          notes: notes || null,
          result,
          userId: (session.user as { id?: string }).id || null,
        },
      });
    }
    return NextResponse.json({ result });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: String(e), result: "AI call failed" },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(compoundHandler);
