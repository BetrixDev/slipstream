import type { videoDeletionTask } from "@/trigger/video-deletion";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createServerFn } from "@tanstack/start";
import { tasks, auth as triggerAuth } from "@trigger.dev/sdk/v3";
import { Redis } from "@upstash/redis";
import { and, eq, sql } from "drizzle-orm";
import { UTApi } from "uploadthing/server";
import { z } from "zod";
import { db } from "../lib/db";
import { env } from "../lib/env";
import { users, videos } from "../lib/schema";
import { authGuardMiddleware } from "../middleware/auth-guard";

export const getVideoDownloadDetailsServerFn = createServerFn({
  method: "POST",
})
  .validator(z.object({ videoId: z.string() }))
  .middleware([authGuardMiddleware])
  .handler(async ({ context, data }) => {
    const videoData = await db.query.videos.findFirst({
      where: (table, { eq, and }) =>
        and(eq(table.id, data.videoId), eq(table.authorId, context.userId)),
    });

    if (!videoData) {
      return { url: null };
    }

    const nativeVideoSource = videoData.sources.find((source) => source.isNative);

    if (!nativeVideoSource) {
      throw new Error("Unable to get video source");
    }

    if (nativeVideoSource.source === "s3") {
      const s3ReadOnlyClient = new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        credentials: {
          accessKeyId: env.S3_READ_ONLY_ACCESS_KEY,
          secretAccessKey: env.S3_READ_ONLY_SECRET_KEY,
        },
      });

      const command = new GetObjectCommand({
        Bucket: env.VIDEOS_BUCKET_NAME,
        Key: nativeVideoSource.key,
      });

      // biome-ignore lint/suspicious/noExplicitAny: types for package aren't correct
      const url = await getSignedUrl(s3ReadOnlyClient as any, command, {
        expiresIn: 3600,
      });

      return { url };
    }

    const utApi = new UTApi();

    const { ufsUrl } = await utApi.generateSignedURL(nativeVideoSource.key, {
      expiresIn: "1 hour",
    });

    return { url: ufsUrl };
  });

export const deleteVideoServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ videoId: z.string() }))
  .middleware([authGuardMiddleware])
  .handler(async ({ context, data }) => {
    try {
      await Promise.all([
        db
          .update(videos)
          .set({
            isQueuedForDeletion: true,
          })
          .where(and(eq(videos.id, data.videoId), eq(videos.authorId, context.userId))),
        tasks.trigger<typeof videoDeletionTask>("video-deletion", {
          videoId: data.videoId,
        }),
      ]);
    } catch (error) {
      console.error(error);

      throw error;
    }

    return { success: true, message: "Video queued for deletion" };
  });

export const onUploadCancelledServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ videoId: z.string() }))
  .middleware([authGuardMiddleware])
  .handler(async ({ context, data }) => {
    const userData = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.id, context.userId),
    });

    if (!userData) {
      throw new Error("User not found");
    }

    const [[videoData]] = await db.batch([
      db
        .delete(videos)
        .where(and(eq(videos.id, data.videoId), eq(videos.authorId, context.userId)))
        .returning(),
      db
        .update(users)
        .set({
          totalStorageUsed: sql<number>`
            COALESCE(
              (
                SELECT SUM(${videos.fileSizeBytes})
                FROM ${videos}
                WHERE ${videos.authorId} = ${context.userId} AND ${videos.status} != 'deleting'
              ),
              0
            )
          `,
        })
        .where(eq(users.id, context.userId)),
    ]);

    if (videoData) {
      await tasks.trigger<typeof videoDeletionTask>("video-deletion", {
        videoId: videoData.id,
      });
    }

    if (userData.accountTier === "free" || userData.accountTier === "pro") {
      const redis = new Redis({
        url: env.REDIS_REST_URL,
        token: env.REDIS_REST_TOKEN,
      });

      const rateLimitKey = `uploadLimit:${context.userId}`;

      const currentLimitString = await redis.get<string>(rateLimitKey);
      const currentLimit = Number.parseInt(currentLimitString ?? "0");

      if (currentLimit > 0) {
        await redis.decr(rateLimitKey);
      }
    }

    return { success: true };
  });

export const updateVideoDataServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      videoId: z.string(),
      data: z.object({
        title: z.string().optional(),
        isPrivate: z.boolean().optional(),
      }),
    }),
  )
  .middleware([authGuardMiddleware])
  .handler(async ({ context, data }) => {
    const [videoData] = await db
      .update(videos)
      .set(data.data)
      .where(and(eq(videos.id, data.videoId), eq(videos.authorId, context.userId)))
      .returning();

    if (videoData === undefined) {
      return { success: false, message: "Video not found" };
    }

    const redis = new Redis({
      url: env.REDIS_REST_URL,
      token: env.REDIS_REST_TOKEN,
    });

    try {
      const largeThumbnailUrl =
        videoData.largeThumbnailKey && `${env.THUMBNAIL_BASE_URL}/${videoData.largeThumbnailKey}`;

      const videoCreatedAt = videoData.createdAt.toString();

      await redis.hset(`video:${data.videoId}`, {
        videoData: {
          title: videoData.title,
          isPrivate: videoData.isPrivate,
          videoLengthSeconds: videoData.videoLengthSeconds,
          views: videoData.views,
          largeThumbnailKey: videoData.largeThumbnailKey,
          authorId: videoData.authorId,
          sources: videoData.sources,
        },
        largeThumbnailUrl,
        videoCreatedAt,
      });
    } catch {
      redis.del(`video:${data.videoId}`);
    }

    try {
      const cachedVideos = await redis.hget<(typeof videoData)[]>(
        `videos:${context.userId}`,
        "videos",
      );

      if (cachedVideos) {
        await redis.hset(`videos:${context.userId}`, {
          videos: cachedVideos.map((v) => {
            if (v.id === videoData.id) {
              return videoData;
            }

            return v;
          }),
        });
      }
    } catch {
      redis.del(`videos:${context.userId}`);
    }

    return {
      success: true,
      message: "Video has been updated.",
      description: videoData.title,
    };
  });

const USER_VIDEO_DAILY_LIMIT: Record<string, number> = {
  free: 3,
  pro: 12,
};

export async function incrementUserUploadRateLimit(accountTier: string, userId: string) {
  if (accountTier === "premium" || accountTier === "ultimate") {
    return true;
  }

  const redis = new Redis({
    url: env.REDIS_REST_URL,
    token: env.REDIS_REST_TOKEN,
  });

  const userDailyLimit = USER_VIDEO_DAILY_LIMIT[accountTier] ?? 3;

  const rateLimitKey = `uploadLimit:${userId}`;

  const currentLimitString = await redis.get<string>(rateLimitKey);
  const currentLimit = Number.parseInt(currentLimitString ?? "0");

  if (currentLimit >= userDailyLimit) {
    return false;
  }

  if (currentLimitString === null) {
    await redis.set(rateLimitKey, "1", { ex: 60 * 60 * 24 });
  } else {
    await redis.incr(rateLimitKey);
  }

  return true;
}
