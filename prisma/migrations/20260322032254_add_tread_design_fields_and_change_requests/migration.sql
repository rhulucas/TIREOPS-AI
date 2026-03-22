/*
  Warnings:

  - Added the required column `updated_at` to the `TreadDesign` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TreadDesign" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'PCR',
ADD COLUMN     "groove_depth_mm" DOUBLE PRECISION,
ADD COLUMN     "noise_rating" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "rolling_resistance" TEXT,
ADD COLUMN     "season" TEXT NOT NULL DEFAULT 'ALL_SEASON',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "wet_grip_rating" TEXT;

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "design_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "proposed_changes" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "review_note" TEXT,
    "reviewer_id" TEXT,
    "ai_assessment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "TreadDesign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
