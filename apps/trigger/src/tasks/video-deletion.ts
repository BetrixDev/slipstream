import { AbortTaskRunError, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { envSchema } from "../utils/env.js";
import { DeleteObjectCommand, ListObjectVersionsCommand, S3Client } from "@aws-sdk/client-s3";
import { db, eq, sql, users, videos } from "db";

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
  },
});
