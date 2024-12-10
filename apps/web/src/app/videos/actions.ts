"use server";

import { auth } from "@clerk/nextjs/server";
import { and, db, eq, sql, users, videos } from "db";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";
import {
  FREE_PLAN_VIDEO_RETENION_DAYS,
  MAX_FILE_SIZE_FREE_TIER,
  PLAN_STORAGE_SIZES,
  VIDEO_TITLE_MAX_LENGTH,
} from "cms";
import { nanoid } from "nanoid";
import { tasks, auth as triggerAuth, runs } from "@trigger.dev/sdk/v3";
import type {
  initialUploadTask,
  thumbnailTrackTask,
  transcodingTask,
  videoDeletionTask,
} from "trigger";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: env.REDIS_REST_URL,
  token: env.REDIS_REST_TOKEN,
});

export async function getVideoDownloadDetails(videoId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { url: null };
  }

  const videoData = await db.query.videos.findFirst({
    where: (table, { eq, and }) => and(eq(table.id, videoId), eq(table.authorId, userId)),
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

  const url = await getSignedUrl(s3ReadOnlyClient as any, command, {
    expiresIn: 3600,
  });

  return { url };
}

export async function deleteVideo(videoId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, message: "Not authorized" };
  }

  // TODO: use realtime to inform the user better

  await tasks.trigger<typeof videoDeletionTask>("video-deletion", { videoId });

  return {
    success: true,
    message: "Video queued for deletion",
  };
}

type UploadPreflightResponse =
  | { success: false; message: string }
  | { success: true; url: string; key: string };

export async function getuploadPreflightData(
  contentLength: number,
  contentType: string,
): Promise<UploadPreflightResponse> {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, message: "You must be signed in" };
  }

  const userData = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
  });

  if (!userData) {
    return { success: false, message: "User not found" };
  }

  const canUploadVideoToday = await incrementUserUploadRateLimit(userData.accountTier, userId);

  if (!canUploadVideoToday) {
    return { success: false, message: "You have reached your daily upload limit." };
  }

  const maxFileSize = userData.accountTier === "free" ? MAX_FILE_SIZE_FREE_TIER : Infinity;

  if (
    userData.totalStorageUsed + contentLength > PLAN_STORAGE_SIZES[userData.accountTier] ||
    contentLength > maxFileSize
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
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    { expiresIn: 3600 },
  );

  return { success: true, url, key: objectKey };
}

export async function uploadComplete(key: string, title: string, mimeType: string) {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, message: "Not authorized" };
  }

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
    Key: key,
  });

  const headResponse = await s3Client.send(headObjectCommand);

  if (headResponse.ContentLength === undefined) {
    return { success: false, message: "File not found" };
  }

  const userData = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
  });

  if (!userData) {
    return { success: false, message: "User not found" };
  }

  if (!userData) {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: env.VIDEOS_BUCKET_NAME,
        Key: key,
      }),
    );
    return { success: false, message: "Unauthorized" };
  }

  const maxFileSize = userData.accountTier === "free" ? MAX_FILE_SIZE_FREE_TIER : Infinity;

  if (
    userData.totalStorageUsed + headResponse.ContentLength >
      PLAN_STORAGE_SIZES[userData.accountTier] ||
    headResponse.ContentLength > maxFileSize
  ) {
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: env.VIDEOS_BUCKET_NAME,
          Key: key,
        }),
      );
    } catch (e) {
      console.error(e);
    } finally {
      return { success: false, message: "Storage limit reached" };
    }
  }

  let videoId = nanoid(8);

  while (
    (await db.query.videos.findFirst({
      where: (table, { eq }) => eq(table.id, videoId),
    })) !== undefined
  ) {
    videoId = nanoid(8);
  }

  await db
    .update(users)
    .set({
      totalStorageUsed: userData.totalStorageUsed + (headResponse!.ContentLength ?? 0),
    })
    .where(eq(users.id, userId));

  const [videoData] = await db
    .insert(videos)
    .values({
      id: videoId,
      authorId: userId,
      nativeFileKey: key,
      fileSizeBytes: headResponse?.ContentLength ?? 0,
      title: title.substring(0, VIDEO_TITLE_MAX_LENGTH),
      isProcessing: userData.accountTier !== "free",
      deletionDate:
        userData.accountTier === "free"
          ? sql.raw(`now() + INTERVAL '${FREE_PLAN_VIDEO_RETENION_DAYS} days'`)
          : null,
      sources: [
        {
          isNative: true,
          key: key,
          type: mimeType === "video/quicktime" ? "video/mp4" : mimeType,
        },
      ],
    })
    .returning();

  try {
    const cachedVideos = await redis.hget<(typeof videoData)[]>(`videos:${userId}`, "videos");

    if (cachedVideos) {
      await redis.hset(`videos:${userId}`, { videos: [videoData, ...cachedVideos] });
    }
  } catch {
    redis.del(`videos:${userId}`);
  }

  try {
    const promises: Promise<any>[] = [
      tasks.trigger<typeof initialUploadTask>(
        "initial-upload",
        { videoId: videoData.id },
        { tags: [userId, `initial-upload-${videoId}`, `video_${videoData.id}`] },
        { publicAccessToken: { expirationTime: "1hr" } },
      ),
    ];

    if (userData.accountTier !== "free") {
      promises.push(
        tasks.trigger<typeof transcodingTask>(
          "transcoding",
          { videoId: videoData.id },
          { tags: [userId, `video_${videoData.id}`] },
        ),
      );
    }

    if (!videoData.isPrivate) {
      promises.push(
        tasks.trigger<typeof thumbnailTrackTask>(
          "thumbnail-track",
          { videoId },
          { tags: [userId, `video_${videoId}`] },
        ),
      );
    }

    await Promise.all(promises);
  } catch (e) {
    console.error(e);

    await Promise.all([
      db
        .update(users)
        .set({
          totalStorageUsed: Math.max(
            userData.totalStorageUsed - (headResponse?.ContentLength ?? 0),
            0,
          ),
        })
        .where(eq(users.id, userId)),
      db.delete(videos).where(eq(videos.id, videoData.id)),
      s3Client.send(
        new DeleteObjectCommand({
          Bucket: env.VIDEOS_BUCKET_NAME,
          Key: key,
        }),
      ),
    ]);

    return { success: false, message: "Failed to process video" };
  }

  return {
    success: true,
    triggerAccessToken: await triggerAuth.createPublicToken({
      scopes: {
        read: { tags: `initial-upload-${videoId}` },
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
}

export async function onUploadCancelled(videoId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, message: "Not authorized" };
  }

  const userData = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
  });

  if (!userData) {
    return { success: false, message: "User not found" };
  }

  const [videoData] = await db
    .delete(videos)
    .where(and(eq(videos.id, videoId), eq(videos.authorId, userId)))
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
            WHERE ${videos.authorId} = ${userId}
          ),
          0
        )
      `,
    })
    .where(eq(users.id, userId))
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
      }),
    );
  }

  if (userData.accountTier === "free" || userData.accountTier === "pro") {
    const rateLimitKey = `uploadLimit:${userId}`;

    const currentLimitString = await redis.get<string>(rateLimitKey);
    const currentLimit = parseInt(currentLimitString ?? "0");

    if (currentLimit > 0) {
      await redis.decr(rateLimitKey);
    }
  }

  return { success: true };
}

type VideoUpdateData = {
  title?: string;
  isPrivate?: boolean;
};

export async function updateVideoData(videoId: string, data: VideoUpdateData) {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, message: "Not authorized" };
  }

  const [videoData] = await db
    .update(videos)
    .set(data)
    .where(and(eq(videos.id, videoId), eq(videos.authorId, userId)))
    .returning();

  if (videoData === undefined) {
    return { success: false, message: "Video not found" };
  }

  try {
    const largeThumbnailUrl =
      videoData.largeThumbnailKey && `${env.THUMBNAIL_BASE_URL}/${videoData.largeThumbnailKey}`;

    const videoCreatedAt = videoData.createdAt.toString();

    await redis.hset(`video:${videoId}`, {
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
    redis.del(`video:${videoId}`);
  }

  try {
    const cachedVideos = await redis.hget<(typeof videoData)[]>(`videos:${userId}`, "videos");

    if (cachedVideos) {
      await redis.hset(`videos:${userId}`, {
        videos: cachedVideos.map((v) => {
          if (v.id === videoData.id) {
            return videoData;
          }

          return v;
        }),
      });
    }
  } catch {
    redis.del(`videos:${userId}`);
  }

  return { success: true, message: "Video has been updated.", description: videoData.title };
}

const USER_VIDEO_DAILY_LIMIT: Record<string, number> = {
  free: 3,
  pro: 12,
};

async function incrementUserUploadRateLimit(accountTier: string, userId: string) {
  if (accountTier === "premium" || accountTier === "ultimate") {
    return true;
  }

  const userDailyLimit = USER_VIDEO_DAILY_LIMIT[accountTier] ?? 3;

  const rateLimitKey = `uploadLimit:${userId}`;

  const currentLimitString = await redis.get<string>(rateLimitKey);
  const currentLimit = parseInt(currentLimitString ?? "0");

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
