CREATE TABLE `uploading_videos` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`key` text NOT NULL,
	`thumbnail_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`is_private` integer DEFAULT false NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`file_size_bytes` real NOT NULL,
	`video_length_seconds` integer
);
--> statement-breakpoint
CREATE INDEX `uauthorId_idx` ON `uploading_videos` (`author_id`);--> statement-breakpoint
CREATE INDEX `uvideoId_idx` ON `uploading_videos` (`id`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `users` (`id`);--> statement-breakpoint
CREATE INDEX `authorId_idx` ON `videos` (`user_id`);--> statement-breakpoint
CREATE INDEX `videoId_idx` ON `videos` (`id`);