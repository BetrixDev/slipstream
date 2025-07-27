import { createReadStream, createWriteStream, readdirSync } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { getPlayableMimeType } from "@/server/utils";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { AbortTaskRunError, logger, metadata, schemaTask } from "@trigger.dev/sdk/v3";
import { Redis } from "@upstash/redis";
import { eq } from "drizzle-orm";
import { execa } from "execa";
import { fileTypeFromStream } from "file-type";
import got from "got";
import sharp from "sharp";
import { z } from "zod";
import { LOWEST_BITRATE_THRESHOLD } from "../../app/lib/constants";
import { db } from "../../app/lib/db";
import { type S3VideoSource, videos } from "../../app/lib/schema";
import { deleteFromUploadthingTask } from "./delete-from-uploadthing";

const Step = z.enum([
  "thumbnails",
  "transcoding",
  "thumbnail-track",
  "video-duration",
  "video-size",
]);

export type Step = z.infer<typeof Step>;

export const videoProcessingTask = schemaTask({
  id: "video-processing",
  schema: z.object({
    videoId: z.string(),
    steps: z.array(Step),
    forceTranscoding: z.boolean().default(false),
  }),
  machine: {
    preset: "large-1x",
  },
  retry: {
    outOfMemory: {
      machine: "large-2x",
    },
  },
  description:
    "Performs all video processing related functions. All in one task so we only spend time downloading the native file once and then we can stream in the processing data live.",
  run: async ({ videoId, steps, forceTranscoding }, { ctx, signal }) => {
    const abortController = signal && {
      // The Upload class needs the entire AbortController for some reason
      abort: () => {},
      signal,
    };

    metadata.set("videoId", videoId);
    logger.info("Starting video processing", { videoId, steps });

    const failedSteps: Step[] = [];

    const { env } = await import("../../app/lib/env");

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

    const videoData = await logger.trace("Postgres videos", async (span) => {
      span.setAttributes({
        videoId,
        table: "videos",
      });

      const data = await db.query.videos.findFirst({
        where: (table, { eq }) => eq(table.id, videoId),
        with: {
          author: true,
        },
      });

      span.end();

      return data;
    });

    if (!videoData) {
      throw new AbortTaskRunError(`No video found with id ${videoId}`);
    }

    const workingDir = path.join(os.tmpdir(), `${ctx.task.id}-${ctx.attempt.id}`);
    await mkdir(workingDir, { recursive: true });

    const nativeVideoSource = videoData.sources.find((source) => source.isNative);

    if (!nativeVideoSource) {
      throw new AbortTaskRunError(`No native video source found for video ${videoId}`);
    }

    const nativeFilePath = path.join(workingDir, nativeVideoSource.key);

    const downloadStart = Date.now();

    await logger.trace("Downloading native video", async (span) => {
      if (nativeVideoSource.source === "ut") {
        span.setAttribute("source", "ut");

        const response = got.stream(
          `https://${env.UPLOADTHING_APP_ID}.ufs.sh/f/${nativeVideoSource.key}`,
          {
            signal,
          },
        );

        const writeStream = createWriteStream(nativeFilePath, { signal });

        try {
          await pipeline(response, writeStream);
        } catch (error) {
          logger.error("Error downloading file from UT");
          throw error;
        }
      } else {
        span.setAttribute("source", "s3");

        const getObjectCommand = new GetObjectCommand({
          Bucket: env.VIDEOS_BUCKET_NAME,
          Key: nativeVideoSource.key,
        });

        const response = await s3Client.send(getObjectCommand, {
          abortSignal: signal,
        });

        const responseBody = response.Body;

        await new Promise((resolve, reject) => {
          if (responseBody instanceof Readable) {
            const writeStream = createWriteStream(nativeFilePath, { signal });

            responseBody
              .pipe(writeStream)
              .on("error", (err) => reject(err))
              .on("close", () => resolve(null));
          } else {
            reject(new Error("Body is not instanceof Readable"));
          }
        });
      }
    });

    const videoFsStats = await stat(nativeFilePath);

    const downloadFinish = Date.now();
    const downloadTime = (downloadFinish - downloadStart) / 1000;
    const mpbs = (videoFsStats.size / 125000 / downloadTime).toFixed(2);
    logger.info(`Finished video download ${mpbs}mpbs`, { mpbs });

    const promises: Promise<unknown>[] = [];

    const dbUpdatePayload: Partial<typeof videos.$inferInsert> = {
      status: "ready",
    };

    if (steps.includes("video-size")) {
      logger.info("Getting video size");

      const videoSizeBytes = videoFsStats.size;

      if (videoSizeBytes !== videoData.fileSizeBytes) {
        dbUpdatePayload.fileSizeBytes = videoSizeBytes;
      } else {
        logger.info("Video size is the same as the previous size");
      }

      metadata.set("videoSize", videoSizeBytes);
    }

    if (steps.includes("thumbnails")) {
      await logger.trace("Step thumbnails", async (span) => {
        const framesDir = path.join(workingDir, "frames");
        await mkdir(framesDir, { recursive: true });

        // First get video duration and fps
        const { stdout: videoInfo } =
          await execa`ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate,duration -of json ${nativeFilePath}`;
        const info = JSON.parse(videoInfo);

        // Parse frame rate (comes as ratio like "24000/1001")
        const [num, den] = info.streams[0].r_frame_rate.split("/");
        const fps = Number(num) / (Number(den) || 1);

        // Get duration in seconds
        const duration = Math.min(Number(info.streams[0].duration) || 60, 60); // Cap at 60 seconds

        // Calculate sampling interval to get ~10 frames from first minute
        // but ensure we don't sample faster than 1 frame per second
        const targetFrames = 10;
        const interval = Math.max(duration / targetFrames, 1);

        logger.info("Video analysis", {
          fps,
          duration,
          samplingInterval: interval,
          expectedFrames: Math.floor(duration / interval),
        });

        // Extract frames using calculated interval
        await logger.trace("FFMPEG multiple thumbnails", async (span) => {
          try {
            await execa`ffmpeg -i ${nativeFilePath} -vf fps=1/${interval} -t ${duration} -q:v 75 -f image2 ${framesDir}/frame_%03d.webp`;
          } catch (error) {
            logger.error("Failed to extract frames", { error });
            // Fallback to single frame if multiple frames fail
            await execa`ffmpeg -i ${nativeFilePath} -frames:v 1 -q:v 75 -f image2 ${framesDir}/frame_001.webp`;
          }
        });

        // Find the brightest frame
        const files = readdirSync(framesDir).sort(); // Ensure consistent order
        let brightestFrame = "";
        let maxBrightness = -1;

        if (files.length === 0) {
          throw new Error("No frames were extracted");
        }

        // Default to first frame in case brightness calculation fails
        brightestFrame = path.join(framesDir, files[0]);

        try {
          await Promise.all(
            files.map(async (file) => {
              const framePath = path.join(framesDir, file);
              try {
                const stats = await sharp(framePath).stats();

                // Calculate perceived brightness using the luminance formula
                const brightness =
                  stats.channels[0].mean * 0.299 + // Red
                  stats.channels[1].mean * 0.587 + // Green
                  stats.channels[2].mean * 0.114; // Blue

                if (brightness > maxBrightness) {
                  maxBrightness = brightness;
                  brightestFrame = framePath;
                }
              } catch (error) {
                logger.error("Failed to process frame", { file, error });
              }
            }),
          );

          logger.info("Selected brightest frame", {
            brightness: maxBrightness,
            frame: brightestFrame,
            totalFrames: files.length,
          });
        } catch (error) {
          logger.error("Failed to process frames for brightness", { error });
          // We'll use the default first frame that was set earlier
        }

        const uploadPromises: Promise<unknown>[] = [];

        await Promise.all([
          logger
            .trace("Sharp large thumbnail", async (span) => {
              const buffer = await sharp(brightestFrame)
                .webp({ quality: 90, effort: 6, alphaQuality: 90 })
                .toBuffer();

              span.end();
              return buffer;
            })
            .then((buffer) => {
              uploadPromises.push(
                new Upload({
                  client: s3Client,
                  params: {
                    Bucket: env.THUMBS_BUCKET_NAME,
                    Key: `${videoData.id}-large.webp`,
                    Body: buffer,
                    CacheControl: "public, max-age=31536000",
                    ContentType: "image/webp",
                  },
                  abortController,
                }).done(),
              );
            }),
          logger
            .trace("Sharp small thumbnail", async (span) => {
              const buffer = await sharp(brightestFrame)
                .resize(1280, 720, { fit: "cover" })
                .webp({
                  quality: 70,
                  effort: 6,
                  lossless: false,
                  alphaQuality: 80,
                })
                .toBuffer();

              span.end();
              return buffer;
            })
            .then((buffer) => {
              uploadPromises.push(
                new Upload({
                  client: s3Client,
                  params: {
                    Bucket: env.THUMBS_BUCKET_NAME,
                    Key: `${videoData.id}-small.webp`,
                    Body: buffer,
                    CacheControl: "public, max-age=31536000",
                    ContentType: "image/webp",
                  },
                  abortController,
                }).done(),
              );
            }),
        ]);

        await Promise.all(uploadPromises);

        dbUpdatePayload.largeThumbnailKey = `${videoData.id}-large.webp`;
        dbUpdatePayload.smallThumbnailKey = `${videoData.id}-small.webp`;

        metadata.set(
          "smallThumbnailUrl",
          `${env.THUMBNAIL_BASE_URL}/${dbUpdatePayload.smallThumbnailKey}`,
        );

        metadata.set(
          "largeThumbnailUrl",
          `${env.THUMBNAIL_BASE_URL}/${dbUpdatePayload.largeThumbnailKey}`,
        );

        span.end();
      });
    }

    if (steps.includes("video-duration")) {
      await logger.trace("Step video-duration", async (span) => {
        try {
          const { stdout } = await logger.trace(
            "FFMPEG video duration",
            () =>
              execa`ffprobe -i ${nativeFilePath} -show_entries format=duration -v quiet -of csv=p=0`,
          );

          const videoDurationSeconds = Math.round(Number(stdout.trim()));

          dbUpdatePayload.videoLengthSeconds = videoDurationSeconds;
          metadata.set("videoDuration", videoDurationSeconds);
        } catch (e) {
          // biome-ignore lint/suspicious/noExplicitAny: can log error but types don't allow
          logger.warn("Error geting video length", e as any);
          failedSteps.push("video-duration");
        }

        span.end();
      });
    }

    if (steps.includes("thumbnail-track")) {
      await logger.trace("Step thumbnail-track", async (span) => {
        const nativeVideoSource = videoData.sources.find((source) => source.isNative);

        if (!nativeVideoSource) {
          failedSteps.push("thumbnail-track");
          span.end();
          logger.error("No native video source found for video", { videoId });
          return;
        }

        const thumbnailsDir = path.join(workingDir, "thumbnails");
        await mkdir(thumbnailsDir, { recursive: true });

        const thumbnailWidth =
          "width" in nativeVideoSource && nativeVideoSource.width ? nativeVideoSource.width : 1920;

        const thumbnailHeight =
          "height" in nativeVideoSource && nativeVideoSource.height
            ? nativeVideoSource.height
            : 1080;

        const scaledWidth = Math.round((thumbnailWidth / thumbnailHeight) * 100);

        await logger.trace("FFMPEG thumbnail extraction", async (span) => {
          await execa`ffmpeg -i ${nativeFilePath} -vf fps=1,scale=${scaledWidth}:100 -q:v 2 ${thumbnailsDir}/thumbnail_%03d.jpg`;

          span.end();
        });

        const files = readdirSync(thumbnailsDir);

        const storyboardBuffer = await logger.trace("Sharp storyboard", async () => {
          return await sharp({
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
        });

        const storyboardKey = `${videoData.id}-storyboard.jpg`;

        const storyboardUpload = new Upload({
          client: s3Client,
          params: {
            Bucket: env.THUMBS_BUCKET_NAME,
            Key: storyboardKey,
            Body: storyboardBuffer,
          },
          abortController,
        });

        promises.push(storyboardUpload.done());

        const storyboardJson = generateStoryboard(files.length, scaledWidth, 100);

        dbUpdatePayload.storyboardJson = storyboardJson;

        span.end();
      });
    }

    const nativeFileType = await logger.trace("File type from stream", async (fileTypeSpan) => {
      const nativeFileType = await fileTypeFromStream(
        // biome-ignore lint/suspicious/noExplicitAny: types aren't correct
        createReadStream(nativeFilePath) as any,
      );

      fileTypeSpan.end();

      return nativeFileType;
    });

    const nativeFileMimeType = getPlayableMimeType(nativeFileType?.mime ?? "video/mp4");

    logger.info(`Native video's mime type is ${nativeFileMimeType}`, {
      mime: nativeFileMimeType,
    });

    const { nativeFileWidth, nativeFileHeight } = await logger.trace(
      "Video native resolution",
      async (resSpan) => {
        const { stdout: nativeFileResolution } =
          await execa`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 ${nativeFilePath}`;

        const [nativeFileWidthString, nativeFileHeightString] = nativeFileResolution.split("x");

        const nativeFileWidth = Number(nativeFileWidthString);
        const nativeFileHeight = Number(nativeFileHeightString);
        resSpan.end();

        return {
          nativeFileWidth,
          nativeFileHeight,
        };
      },
    );

    const videoSources: S3VideoSource[] = [
      {
        key: nativeVideoSource.key,
        type: nativeFileMimeType,
        width: nativeFileWidth,
        height: nativeFileHeight,
        isNative: true,
        bitrate: await getVideoFileBitrate(nativeFilePath),
        source: "s3",
      },
    ];

    dbUpdatePayload.sources = videoSources;

    const nativeFileUpload = new Upload({
      client: s3Client,
      params: {
        Bucket: env.VIDEOS_BUCKET_NAME,
        Key: nativeVideoSource.key,
        Body: createReadStream(nativeFilePath),
        ContentType: nativeFileMimeType,
      },
      abortController,
    });

    promises.push(nativeFileUpload.done());

    promises.push(
      // Read the description for deleteFromUploadthingTask to understand why we are delaying this
      deleteFromUploadthingTask.trigger({ videoId }, { delay: "6h" }),
    );

    if (steps.includes("transcoding")) {
      await logger.trace("Step transcoding", async (stepSpan) => {
        if (videoData.author.accountTier === "free" && !forceTranscoding) {
          logger.error(
            `Aborting transcoding video for free tier user (${videoData.authorId}). Set forceTranscoding to true to transcod this video`,
          );

          stepSpan.end();
          return;
        }

        function shouldTranscode() {
          return shouldKeepTranscoding(videoSources.at(-1)?.bitrate ?? 0);
        }

        const resolutionsToGenerate = generateSmallerResolutions({
          width: nativeFileWidth,
          height: nativeFileHeight,
        });

        for (const resolution of resolutionsToGenerate) {
          await logger.trace(`Transcode ${resolution.height}p`, async (transcodeSpan) => {
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

            await logger.trace("FFMPEG transcode", async (ffmpegSpan) => {
              ffmpegSpan.setAttributes({
                resolution: `${resolution.width}x${resolution.height}`,
                crf,
                preset: ffmpegPresetOption,
                outPath,
              });

              await execa`ffmpeg -i ${nativeFilePath} -c:v libx264 -pix_fmt yuv420p -crf ${crf} -preset ${ffmpegPresetOption} -tune zerolatency -c:a aac -vf scale=${resolution.width}:${resolution.height} ${outPath}`;

              ffmpegSpan.end();
            });

            const key = `${nativeVideoSource.key}-${resolution.height}p.mp4`;

            const upload = new Upload({
              client: s3Client,
              params: {
                Bucket: env.VIDEOS_BUCKET_NAME,
                Key: key,
                Body: createReadStream(outPath),
                ContentType: "video/mp4",
              },
              abortController,
            });

            promises.push(upload.done());

            videoSources.push({
              key,
              type: "video/mp4",
              width: resolution.width,
              height: resolution.height,
              isNative: false,
              bitrate: await getVideoFileBitrate(outPath),
              source: "s3",
            });

            transcodeSpan.end();
          });

          if (!shouldTranscode()) {
            logger.info(
              "Hit lower threshold for video bitrate, no more video qualities will be generated",
            );

            break;
          }
        }

        stepSpan.end();
      });
    }

    logger.info(
      `Finished video processing with steps ${steps.join(", ")}. Letting promises finish`,
    );

    promises.push(
      redis.del(`video:${videoData.id}`),
      redis.del(`videoMetadata:${videoData.id}`),
      redis.del(`videos:${videoData.authorId}`),
      db.update(videos).set(dbUpdatePayload).where(eq(videos.id, videoId)),
    );

    await Promise.all(promises);

    logger.info("Promises finished, warming cache");

    return {
      success: failedSteps.length === 0,
      failedSteps,
    };
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
  return logger.trace("Video file bitrate", async (span) => {
    span.setAttributes({
      videoFilePath: path,
    });

    try {
      const { stdout: transcodedFileBitRateString } =
        await execa`ffprobe -v error -select_streams v:0 -show_entries stream=bit_rate -of default=noprint_wrappers=1:nokey=1 ${path}`;

      const transcodedFileBitRate = Number.parseInt(transcodedFileBitRateString);

      span.end();

      return !Number.isNaN(transcodedFileBitRate) ? transcodedFileBitRate : undefined;
    } catch (error) {
      logger.error(`Failed to get video file bitrate for ${path}`, {
        // biome-ignore lint/suspicious/noExplicitAny: not needed
        ...(error as any),
        videoFilePath: path,
      });

      span.end();

      return;
    }
  });
}

function shouldKeepTranscoding(currentBitrate: number) {
  return currentBitrate > LOWEST_BITRATE_THRESHOLD;
}

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
