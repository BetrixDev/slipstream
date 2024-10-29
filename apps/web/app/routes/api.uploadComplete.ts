import { DeleteObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getAuth } from "@clerk/remix/ssr.server";
import { ActionFunctionArgs } from "@vercel/remix";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, eq, sql, users, videos } from "db";
import { json } from "@vercel/remix";
import { env } from "env/web";
import { FREE_PLAN_VIDEO_RETENION_DAYS, MAX_FILE_SIZE_FREE_TIER, PLAN_STORAGE_SIZES } from "cms";
import { Queue } from "bullmq";

const schema = z.object({
  key: z.string(),
  title: z.string(),
  shouldCompress: z.boolean().default(false),
});

export const transcodingQueue = new Queue("{transcoding}", {
  connection: {
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    password: env.REDIS_PASSWORD,
  },
});

export const thumbnailQueue = new Queue("{thumbnail}", {
  connection: {
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    password: env.REDIS_PASSWORD,
  },
});

const s3RootClient = new S3Client({
  endpoint: env.S3_VIDEOS_ENDPOINT,
  region: env.S3_VIDEOS_BUCKET,
  credentials: {
    accessKeyId: env.S3_ROOT_ACCESS_KEY,
    secretAccessKey: env.S3_ROOT_SECRET_KEY,
  },
});

export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const data = schema.parse(await args.request.json());

  const headObjectCommand = new HeadObjectCommand({
    Bucket: env.S3_VIDEOS_BUCKET,
    Key: data.key,
  });

  const response = await s3RootClient.send(headObjectCommand);

  if (response.ContentLength === undefined) {
    return json({ success: false, message: "File not found" }, { status: 404 });
  }

  const userData = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
  });

  if (!userData) {
    await s3RootClient.send(
      new DeleteObjectCommand({
        Bucket: env.S3_VIDEOS_BUCKET,
        Key: data.key,
      }),
    );
    return json({ message: "Unauthorized" }, { status: 401 });
  }

  const maxFileSize = userData.accountTier === "free" ? MAX_FILE_SIZE_FREE_TIER : Infinity;

  if (
    userData.totalStorageUsed + response.ContentLength > PLAN_STORAGE_SIZES[userData.accountTier] ||
    response.ContentLength > maxFileSize
  ) {
    try {
      await s3RootClient.send(
        new DeleteObjectCommand({
          Bucket: env.S3_VIDEOS_BUCKET,
          Key: data.key,
        }),
      );
    } catch (e) {
      console.error(e);
    }

    return json(
      {
        success: false,
        message: "Storage limit reached",
      },
      { status: 413 },
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

  const [_, [videoData]] = await db.batch([
    db
      .update(users)
      .set({
        totalStorageUsed: userData.totalStorageUsed + (response!.ContentLength ?? 0),
      })
      .where(eq(users.id, userId)),
    db
      .insert(videos)
      .values({
        id: videoId,
        authorId: userId,
        nativeFileKey: data.key,
        fileSizeBytes: response?.ContentLength ?? 0,
        title: data.title,
        deletionDate:
          userData.accountTier === "free"
            ? sql.raw(`now() + INTERVAL '${FREE_PLAN_VIDEO_RETENION_DAYS} days'`)
            : undefined,
        sources: [
          {
            isNative: true,
            key: data.key,
            type: "video/mp4",
          },
        ],
      })
      .returning(),
  ]);

  try {
    await Promise.all([
      transcodingQueue.add(
        `transcoding-${videoId}`,
        { videoId, nativeFileKey: data.key },
        {
          attempts: 3,
          backoff: {
            type: "fixed",
            delay: 10000,
          },
        },
      ),
      thumbnailQueue.add(
        `thumbnail-${videoId}`,
        {
          videoId,
        },
        {
          attempts: 3,
          backoff: {
            type: "fixed",
            delay: 10000,
          },
        },
      ),
    ]);
  } catch (e) {
    console.error(e);

    // TODO: create a common function so this can do everything the delete video endpoint does

    await db.batch([
      db
        .update(users)
        .set({
          totalStorageUsed: Math.max(userData.totalStorageUsed - (response?.ContentLength ?? 0), 0),
        })
        .where(eq(users.id, userId)),

      db.delete(videos).where(eq(videos.id, videoData.id)),
    ]);

    return json({ success: false, message: "Failed to process video" }, { status: 500 });
  }

  return json({
    success: true,
    video: {
      id: videoData.id,
      title: videoData.title,
      fileSizeBytes: videoData.fileSizeBytes,
      createdAt: videoData.createdAt,
    },
  });
}
