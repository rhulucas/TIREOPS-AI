import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIdentifier } from "./rate-limit";
import { z } from "zod";

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const id = getClientIdentifier(req);
    const { success } = rateLimit(id);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests, please try again later" },
        { status: 429 }
      );
    }
    return handler(req);
  };
}

export function parseBody<T>(schema: z.ZodSchema<T>) {
  return async (body: unknown): Promise<{ data: T } | { error: string }> => {
    const result = schema.safeParse(body);
    if (!result.success) {
      return { error: result.error.issues.map((e) => e.message).join(", ") };
    }
    return { data: result.data };
  };
}
