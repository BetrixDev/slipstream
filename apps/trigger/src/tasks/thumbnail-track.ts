import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { envSchema } from "../utils/env.js";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db, eq, videos } from "db";
import { mkdir } from "fs/promises";
import path from "path";
import os from "node:os";
import { stat } from "node:fs/promises";
import { createWriteStream, readdirSync } from "node:fs";
import { Readable } from "node:stream";
import { execa } from "execa";
import sharp from "sharp";
import { Upload } from "@aws-sdk/lib-storage";

export const thumbnailTrackTask = schemaTask({
  id: "thumbnail-track",
  machine: {
    preset: "small-2x",
  },
  retry: {
    maxAttempts: 3,
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
      with: {
        author: {
          columns: {
            accountTier: true,
          },
        },
      },
    });

    if (!videoData) {
      throw new AbortTaskRunError(`No video found with id ${payload.videoId}`);
    }

    if (videoData.isPrivate) {
      throw new AbortTaskRunError(`Video ${payload.videoId} is private`);
    }

    const nativeVideoSource = videoData.sources.find((source) => source.isNative);

    if (!nativeVideoSource) {
      throw new AbortTaskRunError(`No native video source found for video ${payload.videoId}`);
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
    const mpbs = ((videoFsStats.size * 8) / (1024 * 1024) / downloadTime).toFixed(2);
    logger.info(`Finished video download ${mpbs}mpbs`, { mpbs });

    const thumbnailsDir = path.join(workingDir, "thumbnails");
    await mkdir(thumbnailsDir, { recursive: true });

    const thumbnailWidth = nativeVideoSource.width ?? 1920;
    const thumbnailHeight = nativeVideoSource.height ?? 1080;

    const scaledWidth = Math.round((thumbnailWidth / thumbnailHeight) * 100);

    await execa`ffmpeg -i ${nativeFilePath} -vf fps=1,scale=${scaledWidth}:100 -q:v 2 ${thumbnailsDir}/thumbnail_%03d.jpg`;

    const files = readdirSync(thumbnailsDir);

    const storyboardBuffer = await sharp({
      create: {
        width: scaledWidth,
        height: 100 * files.length,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .composite(
        await Promise.all(
          files.map(async (file, idx) => ({
            input: path.join(thumbnailsDir, file),
            top: 100 * idx,
            left: 0,
          })),
        ),
      )
      .jpeg({ quality: 75 })
      .toBuffer();

    const storyboardKey = `${videoData.nativeFileKey}-storyboard.jpg`;

    const storyboardUpload = new Upload({
      client: s3Client,
      params: {
        Bucket: env.THUMBS_BUCKET_NAME,
        Key: storyboardKey,
        Body: storyboardBuffer,
        ContentType: "image/webp",
        CacheControl: "max-age=2419200",
      },
    });

    const storyboardJson = generateStoryboard(files.length, scaledWidth, 100);

    const dbPromise = db
      .update(videos)
      .set({
        storyboardJson: storyboardJson,
      })
      .where(eq(videos.id, payload.videoId));

    await Promise.all([storyboardUpload.done(), dbPromise]);

    return {
      success: true,
      storyboardUrl: `${env.THUMBNAIL_BASE_URL}/${storyboardKey}`,
    };
  },
});

type Storyboard = {
  tileWidth: number;
  tileHeight: number;
  tiles: {
    startTime: number;
    x: number;
    y: number;
  }[];
};

function generateStoryboard(
  thumbnailCount: number,
  thumbnailWidth: number,
  thumbnailHeight: number,
): Storyboard {
  const storyboard: Storyboard = {
    tileWidth: thumbnailWidth,
    tileHeight: thumbnailHeight,
    tiles: [],
  };

  for (let i = 0; i < thumbnailCount; i++) {
    storyboard.tiles.push({
      startTime: i,
      x: 0,
      y: i * thumbnailHeight,
    });
  }

  return storyboard;
}
