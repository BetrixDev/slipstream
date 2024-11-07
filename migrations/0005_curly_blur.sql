ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customerId_idx" ON "users" USING btree ("stripe_customer_id");