ALTER TABLE "users" RENAME COLUMN "stripe_customer_id" TO "polar_customer_id";--> statement-breakpoint
DROP INDEX IF EXISTS "customerId_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customerId_idx" ON "users" USING btree ("polar_customer_id");