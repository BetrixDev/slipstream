import {
  FREE_PLAN_VIDEO_RETENION_DAYS,
  MAX_FILE_SIZE_FREE_TIER,
  PLAN_STORAGE_SIZES,
  VIDEO_TITLE_MAX_LENGTH,
} from "../lib/constants";
import { db } from "../lib/db";
import { env } from "../lib/env";
import { users, videos } from "../lib/schema";
import type { videoDeletionTask } from "@/trigger/video-deletion";
import type { Step, videoProcessingTask } from "@/trigger/video-processing";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createServerFn } from "@tanstack/start";
import { tasks, auth as triggerAuth } from "@trigger.dev/sdk/v3";
import { Redis } from "@upstash/redis";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { authGuardMiddleware } from "../middleware/auth-guard";

const redis = new Redis({
  url: env.REDIS_REST_URL,
  token: env.REDIS_REST_TOKEN,
});

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
      Key: videoData.nativeFileKey,
    });

    // biome-ignore lint/suspicious/noExplicitAny: types for package aren't correct
    const url = await getSignedUrl(s3ReadOnlyClient as any, command, {
      expiresIn: 3600,
    });

    return { url };
  });

export const deleteVideoServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ videoId: z.string() }))
  .middleware([authGuardMiddleware])
  .handler(async ({ context, data }) => {
    try {
      await tasks.trigger<typeof videoDeletionTask>("video-deletion", {
        videoId: data.videoId,
      });
    } catch {
      return {
        success: false,
        message: "Failed to delete video",
      };
    }

    return { success: true, message: "Video queue for deletion" };
  });

type UploadPreflightResponse =
  | { success: false; message: string }
  | { success: true; url: string; key: string };

export const getUploadPreflightDataServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      contentLength: z.number(),
      contentType: z.string(),
    })
  )
  .middleware([authGuardMiddleware])
  .handler(async ({ context, data }): Promise<UploadPreflightResponse> => {
    const userData = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.id, context.userId),
    });

    if (!userData) {
      return { success: false, message: "User not found" };
    }

    const canUploadVideoToday = await incrementUserUploadRateLimit(
      userData.accountTier,
      context.userId
    );

    if (!canUploadVideoToday) {
      return {
        success: false,
        message: "You have reached your daily upload limit.",
      };
    }

    const maxFileSize =
      userData.accountTier === "free"
        ? MAX_FILE_SIZE_FREE_TIER
        : Number.POSITIVE_INFINITY;

    if (
      userData.totalStorageUsed + data.contentLength >
        PLAN_STORAGE_SIZES[userData.accountTier] ||
      data.contentLength > maxFileSize
    ) {
      return {
        success: false,
        message:
          "Uploading this video would exceed your total available storage. Please upgrade your account tier, or delete some videos and try again.",
      };
    }

    const s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ROOT_ACCESS_KEY,
        secretAccessKey: env.S3_ROOT_SECRET_KEY,
      },
    });

    const objectKey = nanoid(25);

    const url = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: env.VIDEOS_BUCKET_NAME,
        Key: objectKey,
        ContentType: data.contentType,
        ContentLength: data.contentLength,
      }),
      { expiresIn: 3600 }
    );

    return { success: true, url, key: objectKey };
  });

export const uploadCompleteServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      key: z.string(),
      title: z.string(),
      mimeType: z.string(),
    })
  )
  .middleware([authGuardMiddleware])
  .handler(async ({ context, data }) => {
    const s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ROOT_ACCESS_KEY,
        secretAccessKey: env.S3_ROOT_SECRET_KEY,
      },
    });

    const headObjectCommand = new HeadObjectCommand({
      Bucket: env.VIDEOS_BUCKET_NAME,
      Key: data.key,
    });

    const headResponse = await s3Client.send(headObjectCommand);

    if (headResponse.ContentLength === undefined) {
      return { success: false, message: "File not found" };
    }

    const userData = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.id, context.userId),
    });

    if (!userData) {
      return { success: false, message: "User not found" };
    }

    if (!userData) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: env.VIDEOS_BUCKET_NAME,
          Key: data.key,
        })
      );
      return { success: false, message: "Unauthorized" };
    }

    const maxFileSize =
      userData.accountTier === "free"
        ? MAX_FILE_SIZE_FREE_TIER
        : Number.POSITIVE_INFINITY;

    if (
      userData.totalStorageUsed + headResponse.ContentLength >
        PLAN_STORAGE_SIZES[userData.accountTier] ||
      headResponse.ContentLength > maxFileSize
    ) {
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: env.VIDEOS_BUCKET_NAME,
            Key: data.key,
          })
        );
      } catch (e) {
        console.error(e);
      }

      return { success: false, message: "Storage limit reached" };
    }

    let videoId = nanoid(8);

    while (
      (await db.query.videos.findFirst({
        where: (table, { eq }) => eq(table.id, videoId),
      })) !== undefined
    ) {
      videoId = nanoid(8);
    }

    const [[videoData]] = await db.batch([
      db
        .insert(videos)
        .values({
          id: videoId,
          authorId: context.userId,
          nativeFileKey: data.key,
          fileSizeBytes: headResponse?.ContentLength ?? 0,
          title: data.title.substring(0, VIDEO_TITLE_MAX_LENGTH),
          isProcessing: userData.accountTier !== "free",
          deletionDate:
            userData.accountTier === "free"
              ? sql.raw(
                  `now() + INTERVAL '${FREE_PLAN_VIDEO_RETENION_DAYS} days'`
                )
              : null,
          sources: [
            {
              isNative: true,
              key: data.key,
              type:
                data.mimeType === "video/quicktime"
                  ? "video/mp4"
                  : data.mimeType,
            },
          ],
        })
        .returning(),
      db
        .update(users)
        .set({
          totalStorageUsed:
            userData.totalStorageUsed + (headResponse?.ContentLength ?? 0),
        })
        .where(eq(users.id, context.userId)),
    ]);

    try {
      const cachedVideos = await redis.hget<(typeof videoData)[]>(
        `videos:${context.userId}`,
        "videos"
      );

      if (cachedVideos) {
        await redis.hset(`videos:${context.userId}`, {
          videos: [videoData, ...cachedVideos],
        });
      }
    } catch {
      redis.del(`videos:${context.userId}`);
    }

    try {
      const videoProcessingSteps: Step[] = ["video-duration", "thumbnails"];

      if (userData.accountTier !== "free") {
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
              videoId,
              steps: videoProcessingSteps,
            },
            {
              tags: [`video-processing-${videoData.id}`],
            }
          );
          break;
        } catch (err) {
          if (i === 2) throw err;
        }
      }
    } catch (e) {
      console.error(e);

      await Promise.all([
        db
          .update(users)
          .set({
            totalStorageUsed: Math.max(
              userData.totalStorageUsed - (headResponse?.ContentLength ?? 0),
              0
            ),
          })
          .where(eq(users.id, context.userId)),
        db.delete(videos).where(eq(videos.id, videoData.id)),
        s3Client.send(
          new DeleteObjectCommand({
            Bucket: env.VIDEOS_BUCKET_NAME,
            Key: data.key,
          })
        ),
      ]);

      return { success: false, message: "Failed to process video" };
    }

    return {
      success: true,
      triggerAccessToken: await triggerAuth.createPublicToken({
        scopes: {
          read: { tags: `video-processing-${videoId}` },
        },
      }),
      video: {
        id: videoData.id,
        title: videoData.title,
        fileSizeByes: videoData.fileSizeBytes,
        createdAt: videoData.createdAt.toString(),
        deletionDate: null,
      },
    };
  });

export const onUploadCancelledServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ videoId: z.string() }))
  .middleware([authGuardMiddleware])
  .handler(async ({ context, data }) => {
    const userData = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.id, context.userId),
    });

    if (!userData) {
      return { success: false, message: "User not found" };
    }

    const [videoData] = await db
      .delete(videos)
      .where(
        and(eq(videos.id, data.videoId), eq(videos.authorId, context.userId))
      )
      .returning()
      .execute();

    await db
      .update(users)
      .set({
        totalStorageUsed: sql<number>`
          COALESCE(
            (
              SELECT SUM(${videos.fileSizeBytes})
              FROM ${videos}
              WHERE ${videos.authorId} = ${context.userId}
            ),
            0
          )
        `,
      })
      .where(eq(users.id, context.userId))
      .execute();

    if (videoData) {
      const s3Client = new S3Client({
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        credentials: {
          accessKeyId: env.S3_ROOT_ACCESS_KEY,
          secretAccessKey: env.S3_ROOT_SECRET_KEY,
        },
      });

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: env.VIDEOS_BUCKET_NAME,
          Key: videoData.nativeFileKey,
        })
      );
    }

    if (userData.accountTier === "free" || userData.accountTier === "pro") {
      const rateLimitKey = `uploadLimit:${context.userId}`;

      const currentLimitString = await redis.get<string>(rateLimitKey);
      const currentLimit = Number.parseInt(currentLimitString ?? "0");

      if (currentLimit > 0) {
        await redis.decr(rateLimitKey);
      }
    }

    return { success: true };
  });

type VideoUpdateData = {
  title?: string;
  isPrivate?: boolean;
};

export const updateVideoDataServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      videoId: z.string(),
      data: z.object({
        title: z.string().optional(),
        isPrivate: z.boolean().optional(),
      }),
    })
  )
  .middleware([authGuardMiddleware])
  .handler(async ({ context, data }) => {
    const [videoData] = await db
      .update(videos)
      .set(data.data)
      .where(
        and(eq(videos.id, data.videoId), eq(videos.authorId, context.userId))
      )
      .returning();

    if (videoData === undefined) {
      return { success: false, message: "Video not found" };
    }

    try {
      const largeThumbnailUrl =
        videoData.largeThumbnailKey &&
        `${env.THUMBNAIL_BASE_URL}/${videoData.largeThumbnailKey}`;

      const videoCreatedAt = videoData.createdAt.toString();

      await redis.hset(`video:${data.videoId}`, {
        videoData: {
          title: videoData.title,
          isPrivate: videoData.isPrivate,
          videoLengthSeconds: videoData.videoLengthSeconds,
          isProcessing: videoData.isProcessing,
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
        "videos"
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

async function incrementUserUploadRateLimit(
  accountTier: string,
  userId: string
) {
  if (accountTier === "premium" || accountTier === "ultimate") {
    return true;
  }

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
