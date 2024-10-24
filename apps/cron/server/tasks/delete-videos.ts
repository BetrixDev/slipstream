import { db, eq, sql, users, videos } from "db";
import { DeleteObjectCommand, ListObjectVersionsCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "env/cron";
import { nanoid } from "nanoid";

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

export default defineTask({
  meta: {
    name: "delete-videos",
    description: "Deletes any videos that are past their deletion date",
  },
  run: async () => {
    const taskLogger = logger.child({ taskId: nanoid(10), taskName: "delete-videos" });

    const taskStart = Date.now();
    taskLogger.info("Starting video retention deletion task");

    const videosToDelete = await db.query.videos.findMany({
      where: (table, { sql }) => sql`${table.deletionDate} < NOW()`,
      limit: 25,
      columns: {
        sources: true,
        largeThumbnailKey: true,
        smallThumbnailKey: true,
        id: true,
        fileSizeBytes: true,
        authorId: true,
      },
    });

    taskLogger.debug(`Found ${videosToDelete.length} video(s) to delete`);

    const videosDeleted: string[] = [];
    const failedVideos: string[] = [];

    for (const video of videosToDelete) {
      const start = Date.now();
      taskLogger.debug(`Deleting video with id ${video.id}`, {
        videoId: video.id,
        sourceCount: video.sources.length,
        fileSizeBytes: video.fileSizeBytes,
      });

      const videoDeleteCommandPromises: Promise<any>[] = [];
      const thumbnailDeleteCommands: Promise<any>[] = [];

      for (const source of video.sources) {
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

      if (video.smallThumbnailKey) {
        const smallThumbnailVersions = await s3ThumbsClient.send(
          new ListObjectVersionsCommand({
            Bucket: env.S3_THUMBS_BUCKET,
            Prefix: video.smallThumbnailKey,
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

      if (video.largeThumbnailKey) {
        const largeThumbnailVersions = await s3ThumbsClient.send(
          new ListObjectVersionsCommand({
            Bucket: env.S3_THUMBS_BUCKET,
            Prefix: video.largeThumbnailKey,
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
        await Promise.all([
          ...videoDeleteCommandPromises,
          ...thumbnailDeleteCommands,
          db.batch([
            db.delete(videos).where(eq(videos.id, video.id)),
            db
              .update(users)
              .set({
                totalStorageUsed: sql`GREATEST(${users.totalStorageUsed} - ${video.fileSizeBytes}, 0)`,
              })
              .where(eq(users.id, video.authorId)),
          ]),
        ]);

        videosDeleted.push(video.id);
      } catch (e) {
        taskLogger.error(e);

        failedVideos.push(video.id);
      }

      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      taskLogger.debug(`Deleting video with id ${video.id} in ${elapsed}s`, {
        videoId: video.id,
        fileSizeByes: video.fileSizeBytes,
        elapsed,
      });
    }

    const taskTime = ((Date.now() - taskStart) / 1000).toFixed(2);
    taskLogger.info(`Finished video retention deletion task in ${taskTime}s`, {
      elapsed: taskTime,
      videosDeletedCount: videosToDelete.length,
      videosDeleted,
      failedVideos,
    });

    return {
      message: `Finished video retention deletion task in ${taskTime}s`,
      result: "Success",
      elapsed: taskTime,
      videosDeletedCount: videosToDelete.length,
      videosDeleted,
      failedVideos,
    };
  },
});
