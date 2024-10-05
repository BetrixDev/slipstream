import { Queue, Worker } from "bullmq";
import { Hono } from "hono";
import { db, eq, videos } from "db";
import { env } from "env/transcoder";
import { customAlphabet } from "nanoid";
import { createWriteStream } from "fs";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { pipeline } from "stream";
import util from "util";
import { serve } from "@hono/node-server";
import { bearerAuth } from "hono/bearer-auth";
import { execa } from "execa";
import { stat, rm } from "fs/promises";
import { UTApi } from "uploadthing/server";
import { logger } from "hono/logger";
import sharp from "sharp";
import { glob } from "glob";

const nanoid = customAlphabet("1234567890abcdef", 20);

const utApi = new UTApi({ token: env.UPLOADTHING_TOKEN });

const pipelineAsync = util.promisify(pipeline);

const s3VideosClient = new S3Client({
  credentials: {
    accessKeyId: env.S3_ROOT_ACCESS_KEY,
    secretAccessKey: env.S3_ROOT_SECRET_KEY,
  },
  endpoint: env.S3_ENDPOINT,
  region: env.S3_VIDEOS_REGION,
});

const videoTranscodingQueue = new Queue("videoTranscoding", {
  connection: {
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    password: env.REDIS_PASSWORD,
  },
});

const videoUploadedQueue = new Queue("videoUploaded", {
  connection: {
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    password: env.REDIS_PASSWORD,
  },
});

const videoTranscodingWorker = new Worker(
  "videoTranscoding",
  async (job) => {
    // await execa(`ffmpeg`, [
    //   "-y",
    //   "-i",
    //   downloadId,
    //   "-vcodec",
    //   "libx264",
    //   "-crf",
    //   "27",
    //   "-preset",
    //   "medium",
    //   "-c:a",
    //   "copy",
    //   downloadId,
    // ]);
    // const videoUpload = new Upload({
    //   client: s3VideosClient,
    //   params: {
    //     Bucket: env.S3_VIDEOS_BUCKET,
    //     Key: `${videoId}`,
    //     Body: createReadStream(downloadId),
    //   },
    // });
    // videoUpload.on("httpUploadProgress", (progress) => {
    //   console.log(`Uploaded: ${progress.loaded} of ${progress.total} bytes`);
    // });
    // await videoUpload.done();
  },
  {
    connection: {
      host: env.REDIS_HOST,
      port: Number(env.REDIS_PORT),
      password: env.REDIS_PASSWORD,
    },
  },
);

const videoUploadedWorker = new Worker(
  "videoUploaded",
  async (job) => {
    const start = Date.now();

    const videoId = job.data.videoId;

    console.log("Processing video ", videoId);

    const videoData = await db.query.videos.findFirst({
      where: (table, { eq }) => eq(table.id, videoId),
    });

    if (!videoData) {
      throw new Error(`Video with id ${videoId} not found`);
    }

    const downloadId = nanoid(20);

    const file = createWriteStream(downloadId);

    const getObjectCommand = new GetObjectCommand({
      Bucket: env.S3_VIDEOS_BUCKET,
      Key: videoData.key,
    });

    const data = await s3VideosClient.send(getObjectCommand);

    await pipelineAsync(data.Body as any, file);

    await execa("ffmpeg", ["-i", downloadId, "-vf", "fps=0.25", `${downloadId}_%04d.jpg`]);

    const frames = await glob(`${downloadId}_*.jpg`);

    let brightestFrame = { file: frames[0], brightness: 0 };

    for (const frame of frames) {
      const { data } = await sharp(frame).grayscale().raw().toBuffer({
        resolveWithObject: true,
      });

      let totalBrightness = 0;
      for (let i = 0; i < data.length; i++) {
        totalBrightness += data[i];
      }
      const averageBrightness = totalBrightness / data.length;

      if (averageBrightness > brightestFrame.brightness) {
        brightestFrame = {
          file: frame,
          brightness: averageBrightness,
        };
      }
    }

    sharp.cache(false);
    const image = sharp(brightestFrame.file);

    const smallThumbnailBuffer = await image
      .resize(1280, 720, { fit: "cover" })
      .jpeg({ quality: 75 })
      .toBuffer();
    const smallThumbnailFile = new File(
      [smallThumbnailBuffer],
      `${videoData.key}-thumbnail-small.jpg`,
      { type: "image/jpeg" },
    );

    const largeThumbnailBuffer = await image.jpeg({ quality: 100 }).toBuffer();
    const largeThumbnailFile = new File(
      [largeThumbnailBuffer],
      `${videoData.key}-thumbnail-large.jpg`,
      { type: "image/jpeg" },
    );

    let smallThumbnailUrl: string | undefined = undefined;
    let largeThumbnailUrl: string | undefined = undefined;

    try {
      console.log("Uploading thumbnails to UploadThing");

      const [small, large] = await utApi.uploadFiles([smallThumbnailFile, largeThumbnailFile]);

      smallThumbnailUrl = small.data?.url;
      largeThumbnailUrl = large.data?.url;

      console.log("Uploaded thumbnails");
    } catch (e) {
      console.error("Failed to upload thumbnails to UploadThing", e);
    }

    image.emit("close");

    let fileSizeBytes = undefined;

    try {
      const stats = await stat(downloadId);
      fileSizeBytes = stats.size;
    } catch {
      console.log("Failed to get file size");
    }

    await videoTranscodingQueue.add(`${videoId}-transcode`, {
      videoId,
    });

    const { all } = await execa({
      all: true,
    })`ffprobe -i ${downloadId} -show_entries format=duration -v quiet -of csv=p=0`;

    const videoDurationSeconds = Math.round(Number(all.trim()));

    await db
      .update(videos)
      .set({
        isProcessing: false,
        smallThumbnailUrl: smallThumbnailUrl,
        largeThumbnailUrl: largeThumbnailUrl,
        fileSizeBytes,
        videoLengthSeconds: videoDurationSeconds,
      })
      .where(eq(videos.id, videoId));

    console.log("Cleaning up files");

    try {
      await Promise.all([
        ...frames.map((f) => rm(f, { force: true, maxRetries: 3, recursive: true })),
        rm(downloadId, { force: true, maxRetries: 3, recursive: true }),
      ]);
    } catch (e) {
      console.error("Failed to clean up files", e);
    }

    console.log(
      `Transcoding took ${Date.now() - start}ms for video ${videoId} with a final size of ${fileSizeBytes} bytes`,
    );
  },
  {
    connection: {
      host: env.REDIS_HOST,
      port: Number(env.REDIS_PORT),
      password: env.REDIS_PASSWORD,
    },
  },
);

videoUploadedWorker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

videoUploadedWorker.on("failed", (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});

const api = new Hono();

api.use(logger());
api.use("/api/*", bearerAuth({ token: env.API_SECRET }));

api.get("/hc", (c) => c.text("Hono!"));

api.put("/api/videoUploaded", async (c) => {
  const { videoId } = await c.req.json();

  if (!videoId) {
    c.status(400);
    return c.text("bad request");
  }

  await videoUploadedQueue.add(`${videoId}-initial-process`, {
    videoId,
  });

  c.status(200);
  return c.text("Video processing has been queued");
});

serve({ ...api, port: Number(env.API_PORT), hostname: env.API_HOST }, (info) => {
  console.log(`Listening on ${env.API_PROTOCOL}://${env.API_HOST}:${info.port}`);
});
