-- Create EmailThread table
CREATE TABLE "EmailThread" (
  "id"             TEXT NOT NULL,
  "subject"        TEXT NOT NULL,
  "customer_name"  TEXT NOT NULL,
  "customer_email" TEXT,
  "quote_id"       TEXT,
  "order_id"       TEXT,
  "status"         TEXT NOT NULL DEFAULT 'OPEN',
  "tire_spec"      TEXT,
  "quantity"       INTEGER,
  "unit_price"     DOUBLE PRECISION,
  "user_id"        TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailThread_pkey" PRIMARY KEY ("id")
);

-- Create EmailMessage table
CREATE TABLE "EmailMessage" (
  "id"         TEXT NOT NULL,
  "thread_id"  TEXT NOT NULL,
  "sender"     TEXT NOT NULL,
  "content"    TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- FK: EmailMessage -> EmailThread
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_thread_id_fkey"
  FOREIGN KEY ("thread_id") REFERENCES "EmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: EmailThread -> User
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
