CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`account_tier` text DEFAULT 'free' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`key` text NOT NULL,
	`small_thumbnail_url` text,
	`large_thumbnail_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`is_private` integer DEFAULT false NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`file_size_bytes` real NOT NULL,
	`video_length_seconds` integer,
	`is_processing` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `users` (`id`);--> statement-breakpoint
CREATE INDEX `authorId_idx` ON `videos` (`user_id`);--> statement-breakpoint
CREATE INDEX `videoId_idx` ON `videos` (`id`);