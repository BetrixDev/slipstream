import { Job } from "bullmq";
import { db, eq, sql, users, videos } from "db";
import { logger } from "log.js";
import { env } from "./env.js";
import { DeleteObjectCommand, ListObjectVersionsCommand, S3Client } from "@aws-sdk/client-s3";

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

export default async (job: Job<{ videoId: string }>) => {
  const jobStart = Date.now();

  const jobLogger = logger.child({
    jobId: job.id,
    jobQueue: "{video-deletion}",
    jobData: job.data,
  });

  jobLogger.info("Starting video deletion job");

  const videoData = await db.query.videos.findFirst({
    where: (table, { eq }) => eq(table.id, job.data.videoId),
  });

  if (!videoData) {
    jobLogger.error("Video data not found in database");
    throw new Error(`Video with id ${job.data.videoId} not found`);
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

  await Promise.all([
    ...videoDeleteCommandPromises,
    ...thumbnailDeleteCommands,
    db.batch([
      db.delete(videos).where(eq(videos.id, job.data.videoId)),
      db
        .update(users)
        .set({
          totalStorageUsed: sql`GREATEST(${users.totalStorageUsed} - ${videoData.fileSizeBytes}, 0)`,
        })
        .where(eq(users.id, videoData.authorId)),
    ]),
  ]);

  return {
    elapsed: (Date.now() - jobStart) / 1000,
  };
};
