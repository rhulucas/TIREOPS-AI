import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { status, reviewNote } = await req.json();

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "status must be APPROVED or REJECTED" }, { status: 400 });
  }

  const reviewerId = (session.user as { id?: string }).id!;

  try {
    const updated = await prisma.changeRequest.update({
      where: { id },
      data: {
        status,
        reviewNote: reviewNote || null,
        reviewerId,
      },
      include: {
        design: { select: { id: true, name: true } },
        requester: { select: { name: true, email: true } },
      },
    });

    // If approved and it's an UPDATE type, apply proposedChanges to the design
    if (status === "APPROVED" && updated.type === "UPDATE") {
      try {
        const proposed = JSON.parse(updated.proposedChanges);
        await prisma.treadDesign.update({
          where: { id: updated.designId },
          data: {
            ...(proposed.grooveDepthMm != null && { grooveDepthMm: Number(proposed.grooveDepthMm) }),
            ...(proposed.noiseRating && { noiseRating: proposed.noiseRating }),
            ...(proposed.wetGripRating && { wetGripRating: proposed.wetGripRating }),
            ...(proposed.rollingResistance && { rollingResistance: proposed.rollingResistance }),
            ...(proposed.notes && { notes: proposed.notes }),
            ...(proposed.status && { status: proposed.status }),
          },
        });
      } catch {
        // Non-critical: don't fail if proposed changes can't be parsed
      }
    }

    if (status === "APPROVED" && updated.type === "DEPRECATE") {
      await prisma.treadDesign.update({
        where: { id: updated.designId },
        data: { status: "DISCONTINUED" },
      });
    }

    return NextResponse.json({ request: updated });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
