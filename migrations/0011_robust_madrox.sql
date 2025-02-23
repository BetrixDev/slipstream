ALTER TABLE "videos" RENAME COLUMN "deletion_date" TO "pending_deletion_date";--> statement-breakpoint
DROP INDEX IF EXISTS "deletionDate_idx";--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "status" text DEFAULT 'uploading' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pendingDeletionDate_idx" ON "videos" USING btree ("pending_deletion_date");--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN IF EXISTS "native_file_key";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN IF EXISTS "native_file_source";--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN IF EXISTS "is_processing";