import { relations } from "drizzle-orm";
import { index, int, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    createdAt: int("created_at").notNull(),
    accountTier: text("account_tier", { enum: ["free", "pro", "premium", "ultimate"] })
      .notNull()
      .default("free"),
    totalStorageUsed: real("totalStorageUsed").notNull().default(0),
  },
  (table) => ({ userId_idx: index("userId_idx").on(table.id) }),
);

export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos),
}));

export const videos = sqliteTable(
  "videos",
  {
    id: text("id").primaryKey(),
    authorId: text("user_id").notNull(),
    title: text("title").notNull(),
    key: text("key").notNull(),
    smallThumbnailUrl: text("small_thumbnail_url"),
    largeThumbnailUrl: text("large_thumbnail_url"),
    smallThumbnailKey: text("small_thumbnail_key"),
    largeThumbnailKey: text("large_thumbnail_key"),
    createdAt: int("created_at")
      .notNull()
      .$defaultFn(() => new Date().getUTCMilliseconds()),
    updatedAt: int("updated_at")
      .notNull()
      .$defaultFn(() => new Date().getUTCMilliseconds()),
    isPrivate: int("is_private", { mode: "boolean" }).notNull().default(false),
    views: int("views").notNull().default(0),
    fileSizeBytes: real("file_size_bytes").notNull(),
    videoLengthSeconds: int("video_length_seconds"),
    isProcessing: int("is_processing", { mode: "boolean" }).notNull().default(true),
  },
  (table) => ({
    authorId_idx: index("authorId_idx").on(table.authorId),
    videoId_idx: index("videoId_idx").on(table.id),
  }),
);

export const videosRelations = relations(videos, ({ one }) => ({
  author: one(users, {
    fields: [videos.authorId],
    references: [users.id],
  }),
}));
