-- Add workflow fields to Quote
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "delivery_date" TIMESTAMP(3);

-- Add workflow fields to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "quote_id" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "tracking_number" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shipped_at" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP(3);

-- Add unique constraint on Order.quote_id
CREATE UNIQUE INDEX IF NOT EXISTS "Order_quote_id_key" ON "Order"("quote_id");

-- Add FK from Order to Quote
ALTER TABLE "Order" ADD CONSTRAINT "Order_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add workflow fields to Invoice
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "order_id" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);

-- Add unique constraint on Invoice.order_id
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_order_id_key" ON "Invoice"("order_id");

-- Add FK from Invoice to Order
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
