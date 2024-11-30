import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { envSchema } from "../utils/env.js";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db, eq, videos } from "db";
import path from "path";
import os from "node:os";
import { mkdir, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { createReadStream, createWriteStream } from "node:fs";
import { execa } from "execa";
import { LOWEST_BITRATE_THRESHOLD } from "cms";
import { fileTypeFromStream } from "file-type";
import { Upload } from "@aws-sdk/lib-storage";
import { Redis } from "@upstash/redis";

type VideoSource = {
  key: string;
  type: string;
  width?: number;
  height?: number;
  bitrate?: number;
  isNative: boolean;
};

export const transcodingTask = schemaTask({
  id: "transcoding",
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
    force: z.boolean().default(false),
  }),
  run: async (payload, { ctx }) => {
    const env = envSchema.parse(process.env);

    const redis = new Redis({
      token: env.REDIS_REST_TOKEN,
      url: env.REDIS_REST_URL,
      enableAutoPipelining: true,
    });

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

    if (videoData.author.accountTier === "free" && !payload.force) {
      await db.update(videos).set({ isProcessing: false }).where(eq(videos.id, payload.videoId));

      throw new AbortTaskRunError(
        `Aborting transcoding video for free tier user (${videoData.authorId}). Set force to true to transcod this video`,
      );
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

    logger.info("Getting native video's mime type");

    const nativeFileType = await fileTypeFromStream(createReadStream(nativeFilePath) as any);
    let nativeFileMimeType = nativeFileType?.mime ?? "video/mp4";

    if (nativeFileMimeType === "video/quicktime") {
      nativeFileMimeType = "video/mp4";
    }

    logger.info(`Native video's mime type is ${nativeFileMimeType}`, { mime: nativeFileMimeType });

    logger.info("Getting videos native resolution");

    const { stdout: nativeFileResolution } =
      await execa`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 ${nativeFilePath}`;

    const [nativeFileWidthString, nativeFileHeightString] = nativeFileResolution.split("x");

    const nativeFileWidth = Number(nativeFileWidthString);
    const nativeFileHeight = Number(nativeFileHeightString);

    logger.info(`Native file's resolution is ${nativeFileResolution}`, {
      width: nativeFileWidth,
      height: nativeFileHeight,
    });

    logger.info("Getting video's framerate");

    const { stdout: nativeFileFrameRateFraction } =
      await execa`ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of default=noprint_wrappers=1:nokey=1 ${nativeFilePath}`;

    const [top, bottom] = nativeFileFrameRateFraction.split("/");

    const videoFrameRateDecimal = (parseFloat(top) / parseFloat(bottom)).toFixed(2);

    logger.info(`Video's framerate is ${videoFrameRateDecimal}`, { fps: videoFrameRateDecimal });

    const videoSources: VideoSource[] = [
      {
        key: videoData.nativeFileKey,
        type: nativeFileMimeType,
        width: nativeFileWidth,
        height: nativeFileHeight,
        isNative: true,
        bitrate: await getVideoFileBitrate(nativeFilePath),
      },
    ];

    function shouldTranscode() {
      return shouldKeepTranscoding(videoSources.at(-1)?.bitrate ?? 0);
    }

    const resolutionsToGenerate = generateSmallerResolutions({
      width: nativeFileWidth,
      height: nativeFileHeight,
    });

    const uploadPromises: Promise<any>[] = [];

    for (const resolution of resolutionsToGenerate) {
      const resStart = Date.now();

      logger.info(`Generating video source for ${resolution.height}p`, resolution);

      const isVideoAuthorPremium = videoData.author.accountTier === "premium";
      const ffmpegPresetOption = isVideoAuthorPremium ? "slow" : "medium";
      let crf = resolution.height > 720 ? 25 : 30;

      if (isVideoAuthorPremium) {
        crf -= 5;
      }

      // Reducing the quality of 480p and under resolution to save space and most people will never watch in this res
      if (resolution.height <= 480) {
        crf += 5;
      }

      const outPath = path.join(workingDir, `${resolution.height}p.mp4`);

      await execa`ffmpeg -i ${nativeFilePath} -c:v libx264 -pix_fmt yuv420p -crf ${crf} -preset ${ffmpegPresetOption} -tune zerolatency -c:a aac -vf scale=${resolution.width}:${resolution.height} ${outPath}`;

      const resElapsed = (Date.now() - resStart) / 1000;

      logger.info(`Finished generating video source for ${resolution.height}p in ${resElapsed}s`, {
        resolution,
        elapsed: resElapsed,
      });

      const videoExists =
        (await db.query.videos.findFirst({
          where: (table, { eq }) => eq(table.id, videoData.id),
        })) !== undefined;

      if (!videoExists) {
        logger.error("Video was deleted, exiting early");
        return new AbortTaskRunError("Video was deleted");
      }

      const key = `${videoData.nativeFileKey}-${resolution.height}p.mp4`;

      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: env.VIDEOS_BUCKET_NAME,
          Key: key,
          Body: createReadStream(outPath),
          ContentType: "video/mp4",
        },
      });

      uploadPromises.push(upload.done());

      videoSources.push({
        key,
        type: "video/mp4",
        isNative: false,
        bitrate: await getVideoFileBitrate(outPath),
        ...resolution,
      });

      if (!shouldTranscode()) {
        logger.info(
          "Hit lower threshold for video bitrate, no more video qualities will be generated",
        );
        break;
      }
    }

    await Promise.all(uploadPromises);

    logger.info("Successfully generated all video sources for video");

    await db
      .update(videos)
      .set({
        sources: videoSources,
        isProcessing: false,
      } as any)
      .where(eq(videos.id, videoData.id));

    await redis.del(`video:${videoData.id}`);
  },
});

type Resolution = {
  width: number;
  height: number;
};

function generateSmallerResolutions(nativeResolution: Resolution): Resolution[] {
  const aspectRatio = nativeResolution.width / nativeResolution.height;

  // Define common height values to scale down to
  const commonHeights = [1080, 720, 480];

  // Generate smaller resolutions maintaining the same aspect ratio
  const smallerResolutions: Resolution[] = commonHeights
    .filter((height) => height < nativeResolution.height)
    .map((height) => {
      let width = Math.round(height * aspectRatio);
      width = Math.round(width / 2) * 2; // ensures width is always divisible to two for ffmpeg
      return { width, height };
    });

  return smallerResolutions;
}

async function getVideoFileBitrate(path: string) {
  try {
    const { stdout: transcodedFileBitRateString } =
      await execa`ffprobe -v error -select_streams v:0 -show_entries stream=bit_rate -of default=noprint_wrappers=1:nokey=1 ${path}`;

    const transcodedFileBitRate = parseInt(transcodedFileBitRateString);

    return !isNaN(transcodedFileBitRate) ? transcodedFileBitRate : undefined;
  } catch (error) {
    logger.error(`Failed to get video file bitrate for ${path}`, {
      ...(error as any),
      videoFilePath: path,
    });
    return;
  }
}

function shouldKeepTranscoding(currentBitrate: number) {
  return currentBitrate > LOWEST_BITRATE_THRESHOLD;
}
