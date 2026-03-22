/*
  Warnings:

  - You are about to drop the column `dot_ece` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `eu_label` on the `Quote` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customer_id" TEXT,
ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "value" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Quote" DROP COLUMN "dot_ece",
DROP COLUMN "eu_label",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "compound" TEXT,
ADD COLUMN     "customer_id" TEXT,
ADD COLUMN     "customer_name" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "quantity" INTEGER,
ADD COLUMN     "result" TEXT,
ALTER COLUMN "load_index" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "company" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "customer_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_address" TEXT NOT NULL,
    "order_ref" TEXT,
    "items" TEXT NOT NULL,
    "payment_terms" TEXT NOT NULL DEFAULT 'Net 30',
    "tax_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preview" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDraft" (
    "id" TEXT NOT NULL,
    "inquiry_type" TEXT NOT NULL,
    "email_text" TEXT NOT NULL,
    "tone" TEXT,
    "result" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompoundSpec" (
    "id" TEXT NOT NULL,
    "application_type" TEXT NOT NULL,
    "primary_polymer" TEXT NOT NULL,
    "filler_system" TEXT NOT NULL,
    "shore_a" TEXT,
    "tensile_strength" TEXT,
    "curing_system" TEXT NOT NULL,
    "cure_temp" TEXT,
    "notes" TEXT,
    "result" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompoundSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreadDesign" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "application" TEXT,
    "width_mm" INTEGER,
    "height_mm" INTEGER,
    "mold_spec" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreadDesign_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDraft" ADD CONSTRAINT "EmailDraft_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompoundSpec" ADD CONSTRAINT "CompoundSpec_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreadDesign" ADD CONSTRAINT "TreadDesign_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
