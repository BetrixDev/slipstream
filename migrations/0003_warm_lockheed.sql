ALTER TABLE `users` ADD `totalStorageUsed` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` ADD `small_thumbnail_key` text;--> statement-breakpoint
ALTER TABLE `videos` ADD `large_thumbnail_key` text;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `is_uploading_video`;