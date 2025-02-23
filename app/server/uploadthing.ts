import {
  FREE_PLAN_VIDEO_RETENION_DAYS,
  MAX_FILE_SIZE_FREE_TIER,
} from "@/lib/constants";
import { env } from "@/lib/env";
import { PLAN_STORAGE_SIZES } from "@/lib/constants";
import { db } from "@/lib/db";
import { users, videos } from "@/lib/schema";
import { incrementUserUploadRateLimit } from "@/server-fns/videos";
import { getAuth } from "@clerk/tanstack-start/server";
import { Redis } from "@upstash/redis";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createUploadthing, UploadThingError } from "uploadthing/server";
import type { FileRouter } from "uploadthing/server";
import { z } from "zod";
import type { Step, videoProcessingTask } from "@/trigger/video-processing";
import { tasks, auth as triggerAuth } from "@trigger.dev/sdk/v3";

const f = createUploadthing();

export const uploadRouter = {
  videoUploader: f({
    video: {
      maxFileSize: "4GB",
      maxFileCount: 1,
    },
  })
    .input(
      z.object({ title: z.string(), isPrivate: z.boolean().default(false) })
    )
    .middleware(async ({ req, files, input }) => {
      const videoToUpload = files[0];

      const { userId } = await getAuth(req);

      if (!userId) throw new UploadThingError("Unauthorized");

      const userData = await db.query.users.findFirst({
        where: (table, { eq }) => eq(table.id, userId),
      });

      if (!userData) throw new UploadThingError("User not found");

      const canUploadVideoToday = await incrementUserUploadRateLimit(
        userData.accountTier,
        userId
      );

      if (!canUploadVideoToday) {
        throw new UploadThingError("You have reached your daily upload limit.");
      }

      const maxFileSize =
        userData.accountTier === "free"
          ? MAX_FILE_SIZE_FREE_TIER
          : Number.POSITIVE_INFINITY;

      if (videoToUpload.size > maxFileSize) {
        throw new UploadThingError(
          "This video file is too large for your current plan. Please upgrade your account tier to upload larger videos."
        );
      }

      if (
        userData.totalStorageUsed + videoToUpload.size >
        PLAN_STORAGE_SIZES[userData.accountTier]
      ) {
        throw new UploadThingError(
          "Uploading this video would exceed your total available storage. Please upgrade your account tier or delete some videos and try again."
        );
      }

      let videoId = nanoid(8);

      while (
        (await db.query.videos.findFirst({
          where: (table, { eq }) => eq(table.id, videoId),
        })) !== undefined
      ) {
        videoId = nanoid(8);
      }

      const [[uploadingVideo]] = await db.batch([
        db
          .insert(videos)
          .values({
            authorId: userId,
            id: videoId,
            title: input.title,
            isPrivate: input.isPrivate,
            fileSizeBytes: videoToUpload.size,
            pendingDeletionDate:
              userData.accountTier === "free"
                ? sql.raw(
                    `now() + INTERVAL '${FREE_PLAN_VIDEO_RETENION_DAYS} days'`
                  )
                : null,
          })
          .returning(),
        db
          .update(users)
          .set({
            totalStorageUsed: sql`${users.totalStorageUsed} + ${videoToUpload.size}`,
          })
          .where(eq(users.id, userId)),
      ]);

      return {
        user: {
          id: userId,
          accountTier: userData.accountTier,
        },
        video: {
          id: uploadingVideo.id,
          title: uploadingVideo.title,
          isPrivate: uploadingVideo.isPrivate,
        },
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const redis = new Redis({
        url: env.REDIS_REST_URL,
        token: env.REDIS_REST_TOKEN,
      });

      const [videoData] = await db
        .update(videos)
        .set({
          sources: [
            {
              isNative: true,
              source: "ut",
              key: file.key,
              url: file.ufsUrl,
              type: file.type,
            },
          ],
        })
        .where(eq(videos.id, metadata.video.id))
        .returning();

      try {
        const cachedVideos = await redis.hget<(typeof videoData)[]>(
          `videos:${metadata.user.id}`,
          "videos"
        );

        if (cachedVideos) {
          await redis.hset(`videos:${metadata.user.id}`, {
            videos: [videoData, ...cachedVideos],
          });
        }
      } catch {
        await redis.del(`videos:${metadata.user.id}`);
      }

      const videoProcessingSteps: Step[] = ["video-duration", "thumbnails"];

      if (metadata.user.accountTier !== "free") {
        videoProcessingSteps.push("transcoding");
      }

      if (!videoData.isPrivate) {
        videoProcessingSteps.push("thumbnail-track");
      }

      for (let i = 0; i < 3; i++) {
        try {
          await tasks.trigger<typeof videoProcessingTask>(
            "video-processing",
            {
              videoId: videoData.id,
              steps: videoProcessingSteps,
            },
            {
              tags: [`videoProcessing_${videoData.id}`],
            }
          );
          break;
        } catch (err) {
          if (i === 2) throw err;
        }
      }

      return {
        triggerAccessToken: await triggerAuth.createPublicToken({
          scopes: {
            read: { tags: `videoProcessing_${videoData.id}` },
          },
        }),
        video: {
          id: videoData.id,
          title: videoData.title,
          fileSizeByes: videoData.fileSizeBytes,
          createdAt: videoData.createdAt.toString(),
          pendingDeletionDate:
            videoData.pendingDeletionDate?.toString() ?? null,
        },
      };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
