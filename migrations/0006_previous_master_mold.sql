DROP INDEX IF EXISTS "customerId_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "polar_customer_id" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "polarCustomerId_idx" ON "users" USING btree ("polar_customer_id");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "stripe_customer_id";