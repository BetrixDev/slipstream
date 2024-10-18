CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"account_tier" text DEFAULT 'free' NOT NULL,
	"totalStorageUsed" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "videos" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"native_file_key" text NOT NULL,
	"small_thumbnail_url" text,
	"large_thumbnail_url" text,
	"small_thumbnail_key" text,
	"large_thumbnail_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"views" bigint DEFAULT 0 NOT NULL,
	"file_size_bytes" real NOT NULL,
	"video_length_seconds" integer,
	"is_processing" boolean DEFAULT true NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "userId_idx" ON "users" USING btree ("id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "authorId_idx" ON "videos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "videoId_idx" ON "videos" USING btree ("id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "createdAt_idx" ON "videos" USING btree ("created_at");