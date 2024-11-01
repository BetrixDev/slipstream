import { DeleteObjectCommand, ListObjectVersionsCommand, S3Client } from "@aws-sdk/client-s3";
import { getAuth } from "@clerk/remix/ssr.server";
import { ActionFunctionArgs, json } from "@vercel/remix";
import { z } from "zod";
import { db, videos, and, eq, users, sql } from "db";
import { env } from "~/server/env";
import { Queue } from "bullmq";
import { logger } from "~/server/logger.server";
import { Redis } from "ioredis";

const schema = z.object({
  videoId: z.string(),
});

export const videoDeletionQueue = new Queue("{video-deletion}", {
  connection: new Redis(env.REDIS_URL),
});

const s3VideosClient = new S3Client({
  endpoint: env.S3_VIDEOS_ENDPOINT,
  region: env.S3_VIDEOS_REGION,
  credentials: {
    accessKeyId: env.S3_ROOT_ACCESS_KEY,
    secretAccessKey: env.S3_ROOT_SECRET_KEY,
  },
});

const s3ThumbsClient = new S3Client({
  endpoint: env.S3_THUMBS_ENDPOINT,
  region: env.S3_THUMBS_REGION,
  credentials: {
    accessKeyId: env.S3_ROOT_ACCESS_KEY,
    secretAccessKey: env.S3_ROOT_SECRET_KEY,
  },
});

export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return json(
      { success: false, message: "You must be logged in to delete a video." },
      { status: 401 },
    );
  }

  const parseResult = schema.safeParse(await args.request.json());

  if (!parseResult.success) {
    return json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  const { videoId } = parseResult.data;

  const videoData = await db.query.videos.findFirst({
    where: (table, { and, eq }) => and(eq(table.id, videoId), eq(table.authorId, userId)),
  });

  if (!videoData) {
    return json({ success: false, message: "Video not found." }, { status: 404 });
  }

  const videoDeleteCommandPromises: Promise<any>[] = [];

  for (const source of videoData.sources) {
    const objectVersionsCommands = new ListObjectVersionsCommand({
      Bucket: env.S3_VIDEOS_BUCKET,
      Prefix: `${source.key}`,
    });

    const objectVersions = await s3VideosClient.send(objectVersionsCommands);

    objectVersions.Versions?.forEach((version) => {
      videoDeleteCommandPromises.push(
        new Promise(async (resolve) => {
          resolve(
            await s3VideosClient.send(
              new DeleteObjectCommand({
                Bucket: env.S3_VIDEOS_BUCKET,
                Key: version.Key,
                VersionId: version.VersionId,
              }),
            ),
          );
        }),
      );
    });
  }

  const thumbnailDeleteCommands: Promise<any>[] = [];

  if (videoData.smallThumbnailKey) {
    const smallThumbnailVersions = await s3ThumbsClient.send(
      new ListObjectVersionsCommand({
        Bucket: env.S3_THUMBS_BUCKET,
        Prefix: videoData.smallThumbnailKey,
      }),
    );

    smallThumbnailVersions.Versions?.forEach((version) => {
      thumbnailDeleteCommands.push(
        new Promise(async (resolve) => {
          resolve(
            await s3ThumbsClient.send(
              new DeleteObjectCommand({
                Bucket: env.S3_THUMBS_BUCKET,
                Key: version.Key,
                VersionId: version.VersionId,
              }),
            ),
          );
        }),
      );
    });
  }

  if (videoData.largeThumbnailKey) {
    const largeThumbnailVersions = await s3ThumbsClient.send(
      new ListObjectVersionsCommand({
        Bucket: env.S3_THUMBS_BUCKET,
        Prefix: videoData.largeThumbnailKey,
      }),
    );

    largeThumbnailVersions.Versions?.forEach((version) => {
      thumbnailDeleteCommands.push(
        new Promise(async (resolve) => {
          resolve(
            await s3ThumbsClient.send(
              new DeleteObjectCommand({
                Bucket: env.S3_THUMBS_BUCKET,
                Key: version.Key,
                VersionId: version.VersionId,
              }),
            ),
          );
        }),
      );
    });
  }

  try {
    try {
      await Promise.all([
        ...videoDeleteCommandPromises,
        ...thumbnailDeleteCommands,
        db.batch([
          db.delete(videos).where(and(eq(videos.id, videoId), eq(videos.authorId, userId))),
          db
            .update(users)
            .set({
              totalStorageUsed: sql`GREATEST(${users.totalStorageUsed} - ${videoData.fileSizeBytes}, 0)`,
            })
            .where(eq(users.id, userId)),
        ]),
      ]);
    } catch (e) {
      logger.error("Error deleting videos directly", {
        ...(e as any),
        endpoint: "api/deleteVideo",
      });
    }

    // Add to deletion queue just incase some things failed
    await videoDeletionQueue.add(`video-deletion-${videoId}`, {
      videoId,
    });
  } catch (e) {
    return json({ success: false, message: "Failed to delete video." }, { status: 500 });
  }

  return json({ success: true, title: videoData.title });
}
