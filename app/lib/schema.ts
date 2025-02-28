import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    polarCustomerId: text("polar_customer_id").notNull(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: false })
      .notNull()
      .defaultNow(),
    accountTier: text("account_tier", {
      enum: ["free", "pro", "premium", "ultimate"],
    })
      .notNull()
      .default("free"),
    totalStorageUsed: real("total_storage_used").notNull().default(0),
  },
  (table) => ({
    userId_idx: index("userId_idx").on(table.id),
    email_idx: index("email_idx").on(table.email),
    customerId_idx: index("customerId_idx").on(table.polarCustomerId),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos),
}));

export type UtVideoSource = {
  source: "ut";
  url: string;
  key: string;
  isNative: boolean;
  type?: string;
};

export type S3VideoSource = {
  source: "s3";
  key: string;
  isNative: boolean;
  type?: string;
  width?: number;
  height?: number;
  bitrate?: number;
};

export type VideoSource = UtVideoSource | S3VideoSource;

export type VideoStatus = "uploading" | "processing" | "ready" | "deleting";

export type VideoStoryboard = {
  tileWidth: number;
  tileHeight: number;
  tiles: {
    startTime: number;
    x: number;
    y: number;
  }[];
};

export const videos = pgTable(
  "videos",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    status: text("status").$type<VideoStatus>().notNull().default("uploading"),
    sources: jsonb("sources").$type<VideoSource[]>().notNull().default([]),
    smallThumbnailKey: text("small_thumbnail_key"),
    largeThumbnailKey: text("large_thumbnail_key"),
    createdAt: timestamp("created_at", { withTimezone: false })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
      .notNull()
      .defaultNow(),
    views: bigint("views", { mode: "number" }).notNull().default(0),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
    videoLengthSeconds: integer("video_length_seconds"),
    isPrivate: boolean("is_private").notNull().default(false),
    storyboardJson: jsonb("storyboard_json").$type<VideoStoryboard>(),
    pendingDeletionDate: timestamp("pending_deletion_date"),
    isQueuedForDeletion: boolean("is_queued_for_deletion")
      .notNull()
      .default(false),
  },
  (table) => ({
    authorId_idx: index("authorId_idx").on(table.authorId),
    videoId_idx: index("videoId_idx").on(table.id),
    createdAt_idx: index("createdAt_idx").on(table.createdAt),
    status_idx: index("status_idx").on(table.status),
    pendingDeletionDate_idx: index("pendingDeletionDate_idx").on(
      table.pendingDeletionDate
    ),
  })
);

export const videosRelations = relations(videos, ({ one }) => ({
  author: one(users, {
    fields: [videos.authorId],
    references: [users.id],
  }),
}));
