ALTER TABLE "users" RENAME COLUMN "polar_customer_id" TO "stripe_customer_id";--> statement-breakpoint
DROP INDEX IF EXISTS "polarCustomerId_idx";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "stripe_customer_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customerId_idx" ON "users" USING btree ("stripe_customer_id");