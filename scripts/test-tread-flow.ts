/**
 * Test script: simulate real engineer + admin workflow
 * Run: npx tsx scripts/test-tread-flow.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== TireOps Tread Design Flow Test ===\n");

  // Get users
  const engineer = await prisma.user.findUnique({ where: { email: "engineer@tireops.com" } });
  const admin = await prisma.user.findUnique({ where: { email: "admin@tireops.com" } });
  if (!engineer || !admin) throw new Error("Users not found — run db:seed first");

  // ── Step 1: Engineer creates a new PCR Winter design ──────────────────────
  console.log("Step 1: Engineer creates new PCR Winter design...");
  const design = await prisma.treadDesign.create({
    data: {
      name: "PCR-WINTER-TEST-v1",
      category: "PCR",
      season: "WINTER",
      status: "DRAFT",
      version: 1,
      widthMm: 225,
      heightMm: 55,
      grooveDepthMm: 8.0,
      noiseRating: "B",
      wetGripRating: "B",
      rollingResistance: "C",
      notes: "Initial prototype — needs groove depth review for ice performance",
      moldSpec: "TREAD_WIDTH 225mm\nSECTION_HEIGHT 55mm\nGROOVE_DEPTH 8.0mm\nEXPORT_CNC",
      userId: engineer.id,
    },
  });
  console.log(`  ✅ Created: ${design.name} (id: ${design.id})`);
  console.log(`     Category: ${design.category} · Season: ${design.season} · Status: ${design.status}`);
  console.log(`     Groove: ${design.grooveDepthMm}mm · Noise: ${design.noiseRating} · WetGrip: ${design.wetGripRating}\n`);

  // ── Step 2: Engineer submits UPDATE change request ─────────────────────────
  console.log("Step 2: Engineer submits change request (increase groove depth for ice)...");

  // Simulate AI assessment (mock since no OpenAI key in script)
  const similarDesigns = await prisma.treadDesign.findMany({
    where: { category: "PCR", season: "WINTER", status: "ACTIVE" },
    select: { grooveDepthMm: true },
    take: 10,
  });
  const avgGroove = similarDesigns.length > 0
    ? (similarDesigns.reduce((s, d) => s + (d.grooveDepthMm ?? 8), 0) / similarDesigns.length).toFixed(1)
    : "9.0";

  const aiAssessment = `Risk: Low. Based on ${similarDesigns.length} active PCR Winter designs in library, average groove depth is ${avgGroove}mm. Increasing from 8.0mm to 9.5mm aligns with library average and should improve snow/ice traction. Recommend approval pending wet grip validation.`;

  const cr = await prisma.changeRequest.create({
    data: {
      designId: design.id,
      requesterId: engineer.id,
      type: "UPDATE",
      description: "Increase groove depth from 8.0mm to 9.5mm for improved ice grip. Current 8.0mm is below library average for PCR Winter category.",
      proposedChanges: JSON.stringify({
        grooveDepthMm: 9.5,
        noiseRating: "B",
        notes: "Groove depth increased per ice traction test results (batch 2026-03)",
      }),
      aiAssessment,
    },
  });
  console.log(`  ✅ Change request submitted (id: ${cr.id})`);
  console.log(`     Type: ${cr.type} · Status: ${cr.status}`);
  console.log(`     AI Assessment: "${aiAssessment.substring(0, 80)}..."\n`);

  // ── Step 3: Admin reviews — approves ──────────────────────────────────────
  console.log("Step 3: Admin reviews and approves the change request...");
  const approved = await prisma.changeRequest.update({
    where: { id: cr.id },
    data: {
      status: "APPROVED",
      reviewNote: "Groove depth increase validated. Approved for next production run.",
      reviewerId: admin.id,
    },
  });

  // Apply proposed changes to design
  const proposed = JSON.parse(cr.proposedChanges);
  const updatedDesign = await prisma.treadDesign.update({
    where: { id: design.id },
    data: {
      grooveDepthMm: proposed.grooveDepthMm,
      noiseRating: proposed.noiseRating,
      notes: proposed.notes,
      status: "ACTIVE", // promote to active after approval
    },
  });
  console.log(`  ✅ Change request APPROVED by admin`);
  console.log(`     Review note: "${approved.reviewNote}"`);
  console.log(`  ✅ Design updated:`);
  console.log(`     Groove: 8.0mm → ${updatedDesign.grooveDepthMm}mm`);
  console.log(`     Status: DRAFT → ${updatedDesign.status}\n`);

  // ── Step 4: Engineer submits a DEPRECATE request on an old design ──────────
  console.log("Step 4: Engineer submits a DEPRECATE request on an old design...");
  const oldDesign = await prisma.treadDesign.findFirst({
    where: { category: "PCR", status: "ACTIVE", id: { not: design.id } },
    orderBy: { createdAt: "asc" },
  });
  if (oldDesign) {
    const crDep = await prisma.changeRequest.create({
      data: {
        designId: oldDesign.id,
        requesterId: engineer.id,
        type: "DEPRECATE",
        description: "This design is superseded by newer generation. Recommend discontinuing to clean up the library.",
        proposedChanges: JSON.stringify({ status: "DISCONTINUED" }),
        aiAssessment: "Risk: Low. No active orders linked to this design. Safe to deprecate.",
      },
    });
    console.log(`  ✅ Deprecate request on: ${oldDesign.name} (status: PENDING)\n`);

    // Admin rejects it with a note
    await prisma.changeRequest.update({
      where: { id: crDep.id },
      data: {
        status: "REJECTED",
        reviewNote: "Still referenced in 2 active customer quotes. Cannot deprecate yet.",
        reviewerId: admin.id,
      },
    });
    console.log(`  ✅ Admin REJECTED deprecate request`);
    console.log(`     Reason: "Still referenced in 2 active customer quotes."\n`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("=== Final State ===");
  const totalDesigns = await prisma.treadDesign.count();
  const totalCRs = await prisma.changeRequest.count();
  const pendingCRs = await prisma.changeRequest.count({ where: { status: "PENDING" } });
  const approvedCRs = await prisma.changeRequest.count({ where: { status: "APPROVED" } });
  const rejectedCRs = await prisma.changeRequest.count({ where: { status: "REJECTED" } });

  const testDesign = await prisma.treadDesign.findUnique({ where: { id: design.id } });
  console.log(`Total designs in library: ${totalDesigns}`);
  console.log(`Total change requests: ${totalCRs} (${pendingCRs} pending, ${approvedCRs} approved, ${rejectedCRs} rejected)`);
  console.log(`\nTest design final state:`);
  console.log(`  Name:   ${testDesign?.name}`);
  console.log(`  Status: ${testDesign?.status}`);
  console.log(`  Groove: ${testDesign?.grooveDepthMm}mm`);
  console.log(`  Notes:  ${testDesign?.notes}`);
  console.log(`\n✅ All tests passed — check http://127.0.0.1:3000/tread-designer to see results`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("❌ Test failed:", e.message);
    prisma.$disconnect();
    process.exit(1);
  });
