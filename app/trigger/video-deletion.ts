import { db } from "../../app/lib/db";
import { users, videos } from "../../app/lib/schema";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { AbortTaskRunError, runs, schemaTask } from "@trigger.dev/sdk/v3";
import { Redis } from "@upstash/redis";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { UTApi } from "uploadthing/server";

export const videoDeletionTask = schemaTask({
  id: "video-deletion",
  machine: {
    preset: "micro",
  },
  maxDuration: 60,
  retry: {
    maxAttempts: 3,
  },
  queue: {
    concurrencyLimit: 5,
  },
  schema: z.object({
    videoId: z.string(),
  }),
  description: "Deletes everything about a video from every possible source",
  onFailure: async ({ videoId }) => {
    await import("../../app/lib/env");

    await db
      .update(videos)
      .set({
        isQueuedForDeletion: false,
      })
      .where(eq(videos.id, videoId));
  },
  run: async (payload) => {
    const { env } = await import("../../app/lib/env");

    const s3Client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      credentials: {
        accessKeyId: env.S3_ROOT_ACCESS_KEY,
        secretAccessKey: env.S3_ROOT_SECRET_KEY,
      },
    });

    const utApi = new UTApi();

    const videoData = await db.query.videos.findFirst({
      where: (table, { eq }) => eq(table.id, payload.videoId),
    });

    if (!videoData) {
      throw new AbortTaskRunError(`No video found with id ${payload.videoId}`);
    }

    const associatedRuns = await runs.list({ tag: `video_${videoData.id}` });

    const runsToDeletePromises: Promise<unknown>[] = [];

    for (const run of associatedRuns.data) {
      if (run.isExecuting || run.isQueued) {
        runsToDeletePromises.push(runs.cancel(run.id));
      }
    }

    try {
      await Promise.all(runsToDeletePromises);
    } catch {}

    const videoDeleteCommandPromises: Promise<unknown>[] = [];

    for (const source of videoData.sources) {
      if (source.source === "s3") {
        videoDeleteCommandPromises.push(
          s3Client.send(
            new DeleteObjectCommand({
              Bucket: env.VIDEOS_BUCKET_NAME,
              Key: source.key,
            })
          )
        );
      } else {
        videoDeleteCommandPromises.push(utApi.deleteFiles([source.key]));
      }
    }

    const thumbnailDeleteCommands: Promise<unknown>[] = [];

    if (videoData.smallThumbnailKey) {
      thumbnailDeleteCommands.push(
        s3Client.send(
          new DeleteObjectCommand({
            Bucket: env.THUMBS_BUCKET_NAME,
            Key: videoData.smallThumbnailKey,
          })
        )
      );
    }

    if (videoData.largeThumbnailKey) {
      thumbnailDeleteCommands.push(
        s3Client.send(
          new DeleteObjectCommand({
            Bucket: env.THUMBS_BUCKET_NAME,
            Key: videoData.largeThumbnailKey,
          })
        )
      );
    }

    thumbnailDeleteCommands.push(
      s3Client.send(
        new DeleteObjectCommand({
          Bucket: env.THUMBS_BUCKET_NAME,
          Key: `${videoData.id}-storyboard.jpg`,
        })
      )
    );

    await Promise.all([
      ...videoDeleteCommandPromises,
      ...thumbnailDeleteCommands,
      db.delete(videos).where(eq(videos.id, payload.videoId)),
      db
        .update(users)
        .set({
          totalStorageUsed: sql`GREATEST(${users.totalStorageUsed} - ${videoData.fileSizeBytes}, 0)`,
        })
        .where(eq(users.id, videoData.authorId)),
    ]);

    const redis = new Redis({
      url: env.REDIS_REST_URL,
      token: env.REDIS_REST_TOKEN,
    });

    try {
      const cachedVideos = await redis.hget<(typeof videoData)[]>(
        `videos:${videoData.authorId}`,
        "videos"
      );

      if (cachedVideos) {
        await redis.hset(`videos:${videoData.authorId}`, {
          videos: cachedVideos.filter((v) => v.id !== payload.videoId),
        });
      }
    } catch {
      redis.del(`videos:${videoData.authorId}`).catch();
    }

    return {
      success: true,
      videoTitle: videoData.title,
    };
  },
});
