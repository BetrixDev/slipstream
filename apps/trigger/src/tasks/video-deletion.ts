import { AbortTaskRunError, runs, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { envSchema } from "../utils/env.js";
import { DeleteObjectCommand, ListObjectVersionsCommand, S3Client } from "@aws-sdk/client-s3";
import { db, eq, sql, users, videos } from "db";
import { Redis } from "@upstash/redis";

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
  run: async (payload) => {
    const env = envSchema.parse(process.env);

    const s3Client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      credentials: {
        accessKeyId: env.S3_ROOT_ACCESS_KEY,
        secretAccessKey: env.S3_ROOT_SECRET_KEY,
      },
    });

    const videoData = await db.query.videos.findFirst({
      where: (table, { eq }) => eq(table.id, payload.videoId),
    });

    if (!videoData) {
      throw new AbortTaskRunError(`No video found with id ${payload.videoId}`);
    }

    const associatedRuns = await runs.list({ tag: `video_${videoData.id}` });

    const runsToDeletePromises: Promise<any>[] = [];

    associatedRuns.data.forEach((run) => {
      if (run.isExecuting || run.isQueued) {
        runsToDeletePromises.push(runs.cancel(run.id));
      }
    });

    try {
      await Promise.all(runsToDeletePromises);
    } catch {}

    const videoDeleteCommandPromises: Promise<any>[] = [];

    for (const source of videoData.sources) {
      const objectVersionsCommands = new ListObjectVersionsCommand({
        Bucket: env.VIDEOS_BUCKET_NAME,
        Prefix: `${source.key}`,
      });

      const objectVersions = await s3Client.send(objectVersionsCommands);

      objectVersions.Versions?.forEach((version) => {
        videoDeleteCommandPromises.push(
          new Promise(async (resolve) => {
            resolve(
              await s3Client.send(
                new DeleteObjectCommand({
                  Bucket: env.VIDEOS_BUCKET_NAME,
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
      const smallThumbnailVersions = await s3Client.send(
        new ListObjectVersionsCommand({
          Bucket: env.THUMBS_BUCKET_NAME,
          Prefix: videoData.smallThumbnailKey,
        }),
      );

      smallThumbnailVersions.Versions?.forEach((version) => {
        thumbnailDeleteCommands.push(
          new Promise(async (resolve) => {
            resolve(
              await s3Client.send(
                new DeleteObjectCommand({
                  Bucket: env.THUMBS_BUCKET_NAME,
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
      const largeThumbnailVersions = await s3Client.send(
        new ListObjectVersionsCommand({
          Bucket: env.THUMBS_BUCKET_NAME,
          Prefix: videoData.largeThumbnailKey,
        }),
      );

      largeThumbnailVersions.Versions?.forEach((version) => {
        thumbnailDeleteCommands.push(
          new Promise(async (resolve) => {
            resolve(
              await s3Client.send(
                new DeleteObjectCommand({
                  Bucket: env.THUMBS_BUCKET_NAME,
                  Key: version.Key,
                  VersionId: version.VersionId,
                }),
              ),
            );
          }),
        );
      });
    }

    thumbnailDeleteCommands.push(
      s3Client.send(
        new DeleteObjectCommand({
          Bucket: env.THUMBS_BUCKET_NAME,
          Key: `${videoData.nativeFileKey}-storyboard.jpg`,
        }),
      ),
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
        "videos",
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
