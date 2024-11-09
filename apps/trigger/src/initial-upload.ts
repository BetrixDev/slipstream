import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { initialUploadEnvSchema } from "./utils/env.js";
import os from "node:os";
import { db, eq, sql, videos } from "db";
import path from "node:path";
import { mkdir, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { execa } from "execa";
import sharp from "sharp";

export const initialUploadTask = schemaTask({
  id: "initial-upload",
  machine: {
    preset: "small-2x",
  },
  maxDuration: 3 * 60,
  retry: {
    maxAttempts: 5,
  },
  queue: {
    concurrencyLimit: 5,
  },
  schema: z.object({
    videoId: z.string(),
  }),
  run: async (payload, { ctx }) => {
    const env = initialUploadEnvSchema.parse(process.env);

    const s3Client = new S3Client({
      region: "auto",
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

    const workingDir = path.join(os.tmpdir(), `${ctx.task.id}-${ctx.attempt.id}`);
    await mkdir(workingDir, { recursive: true });

    const nativeFilePath = path.join(workingDir, videoData.nativeFileKey);

    const getObjectCommand = new GetObjectCommand({
      Bucket: env.VIDEOS_BUCKET_NAME,
      Key: videoData.nativeFileKey,
    });

    const response = await s3Client.send(getObjectCommand);

    const responseBody = response.Body;

    logger.info("Starting video download");
    const downloadStart = Date.now();

    await new Promise((resolve, reject) => {
      if (responseBody instanceof Readable) {
        const writeStream = createWriteStream(nativeFilePath);

        responseBody
          .pipe(writeStream)
          .on("error", (err) => reject(err))
          .on("close", () => resolve(null));
      } else {
        reject(new Error("Body is not instanceof Readable"));
      }
    });

    const videoFsStats = await stat(nativeFilePath);

    const downloadFinish = Date.now();
    const downloadTime = (downloadFinish - downloadStart) / 1000;
    const mpbs = ((videoFsStats.size * 8) / (1024 * 1024) / downloadTime).toFixed(2);
    logger.info(`Finished video download ${mpbs}mpbs`, { mpbs });

    logger.info("Generating thumbnail from first frame of video");

    await execa`ffmpeg -i ${nativeFilePath} -frames:v 1 -q:v 75 -f image2 ${nativeFilePath}.webp`;

    const { data } = await sharp(`${nativeFilePath}.webp`).grayscale().raw().toBuffer({
      resolveWithObject: true,
    });

    // TODO: this doesn't work right now
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i++) {
      totalBrightness += data[i];
    }

    if (totalBrightness < 5) {
      logger.info("Frame was too dark, getting one in the future");

      // The image is black and we will grab a frame that is
      await execa`ffmpeg -y -i ${nativeFilePath} -vf "select='eq(n\,min(5*t\,n-1))'" -vsync vfr -frames:v 1 ${nativeFilePath}.webp`;
    }

    const image = sharp(`${nativeFilePath}.webp`);

    const smallThumbnailBuffer = await image
      .resize(1280, 720, { fit: "cover" })
      .webp({ quality: 65, effort: 6, lossless: false, alphaQuality: 80 })
      .toBuffer();

    const largeThumbnailBuffer = await image
      .webp({ quality: 90, effort: 6, alphaQuality: 90 })
      .toBuffer();

    const smallPutObjectCommand = new PutObjectCommand({
      Bucket: env.THUMBS_BUCKET_NAME,
      Key: `${videoData.nativeFileKey}-small.webp`,
      Body: smallThumbnailBuffer,
    });

    const largePutObjectCommand = new PutObjectCommand({
      Bucket: env.THUMBS_BUCKET_NAME,
      Key: `${videoData.nativeFileKey}-large.webp`,
      Body: largeThumbnailBuffer,
    });

    logger.info("Uploading thumbnails");

    await Promise.all([s3Client.send(smallPutObjectCommand), s3Client.send(largePutObjectCommand)]);

    logger.info("Done uploading");

    let videoDurationSeconds: number | undefined = undefined;

    try {
      logger.info("Getting video length");

      const { stdout } =
        await execa`ffprobe -i ${nativeFilePath} -show_entries format=duration -v quiet -of csv=p=0`;

      videoDurationSeconds = Math.round(Number(stdout.trim()));
    } catch (e) {
      logger.warn("Error geting video length", e as any);
    }

    logger.info("Updating database");

    const [updatedVideo] = await db
      .update(videos)
      .set({
        fileSizeBytes: videoFsStats.size,
        largeThumbnailKey: `${videoData.nativeFileKey}-large.webp`,
        smallThumbnailKey: `${videoData.nativeFileKey}-small.webp`,
        videoLengthSeconds: videoDurationSeconds,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(videos.id, videoData.id))
      .returning();

    return {
      success: true,
      videoLengthSeconds: videoDurationSeconds,
      smallThumbnailUrl: `${env.THUMBNAIL_BASE_URL}/${updatedVideo.smallThumbnailKey}`,
    };
  },
});
