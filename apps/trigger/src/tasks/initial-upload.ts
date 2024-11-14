import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { envSchema } from "../utils/env.js";
import os from "node:os";
import { db, eq, sql, videos } from "db";
import path from "node:path";
import { mkdir, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { execa } from "execa";
import sharp from "sharp";
import { Upload } from "@aws-sdk/lib-storage";
import { glob } from "glob";

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

    const workingDir = path.join(os.tmpdir(), `${ctx.task.id}-${ctx.attempt.id}`);
    await mkdir(workingDir, { recursive: true });

    const nativeFilePath = path.join(workingDir, videoData.nativeFileKey);

    const getObjectCommand = new GetObjectCommand({
      Bucket: env.VIDEOS_BUCKET_NAME,
      Key: videoData.nativeFileKey,
    });

    const response = await s3Client.send(getObjectCommand);

    const responseBody = response.Body;

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
    const mpbs = (videoFsStats.size / 125000 / downloadTime).toFixed(2);
    logger.info(`Finished video download ${mpbs}mpbs`, { mpbs });

    logger.info("Generating thumbnail from first frame of video");

    let frameFilePath = `${nativeFilePath}.webp`;

    await execa`ffmpeg -i ${nativeFilePath} -frames:v 1 -q:v 75 -f image2 ${frameFilePath}`;

    const { data, info } = await sharp(`${nativeFilePath}.webp`).grayscale().raw().toBuffer({
      resolveWithObject: true,
    });

    const firstFrameBrightness = calculateBrightness(data, info.width, info.height);
    let currentBrightestFrame = firstFrameBrightness;

    if (firstFrameBrightness < 5) {
      logger.info("Frame was too dark, getting one in the future");

      await execa`ffmpeg -i ${nativeFilePath} -vf fps=0.25 -vframes 10 -frames:v 1 -q:v 75 -f image2 ${nativeFilePath}_%04d.webp`;

      const frames = await glob("*_*.webp", { cwd: workingDir });

      for (const frame of frames) {
        try {
          const { data, info } = await sharp(path.join(workingDir, frame))
            .grayscale()
            .raw()
            .toBuffer({
              resolveWithObject: true,
            });

          const frameBrightness = calculateBrightness(data, info.width, info.height);

          if (frameBrightness > currentBrightestFrame) {
            frameFilePath = path.join(workingDir, frame);
          }
        } catch (e) {
          logger.warn("Error processing frame", e as any);
        }
      }
    }

    const image = sharp(frameFilePath);

    const smallThumbnailBuffer = await image
      .resize(1280, 720, { fit: "cover" })
      .webp({ quality: 70, effort: 6, lossless: false, alphaQuality: 80 })
      .toBuffer();

    const largeThumbnailBuffer = await image
      .webp({ quality: 90, effort: 6, alphaQuality: 90 })
      .toBuffer();

    const smallUpload = new Upload({
      client: s3Client,
      params: {
        Bucket: env.THUMBS_BUCKET_NAME,
        Key: `${videoData.nativeFileKey}-small.webp`,
        Body: smallThumbnailBuffer,
        ContentType: "image/webp",
        CacheControl: "max-age=2419200",
      },
    });

    const largeUpload = new Upload({
      client: s3Client,
      params: {
        Bucket: env.THUMBS_BUCKET_NAME,
        Key: `${videoData.nativeFileKey}-large.webp`,
        Body: largeThumbnailBuffer,
        ContentType: "image/webp",
        CacheControl: "max-age=2419200",
      },
    });

    await Promise.all([smallUpload.done(), largeUpload.done()]);

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

function calculateBrightness(data: Buffer, width: number, height: number): number {
  let totalBrightness = 0;
  const numPixels = width * height;

  for (let i = 0; i < data.length; i += 4) {
    // Extract RGB values
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate brightness for this pixel using a common formula for perceived brightness
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

    totalBrightness += brightness;
  }

  // Calculate average brightness
  return totalBrightness / numPixels;
}
