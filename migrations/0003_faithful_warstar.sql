ALTER TABLE "videos" RENAME COLUMN "user_id" TO "author_id";--> statement-breakpoint
ALTER TABLE "videos" DROP CONSTRAINT "videos_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "authorId_idx";--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "deletion_date" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "videos" ADD CONSTRAINT "videos_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deletionDate_idx" ON "videos" USING btree ("deletion_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "authorId_idx" ON "videos" USING btree ("author_id");