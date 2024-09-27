import { Queue, Worker } from "bullmq";
import { Hono } from "hono";
import { db, eq, videos } from "db";
import { env } from "env/transcoder";
import { customAlphabet } from "nanoid";
import { createReadStream, createWriteStream } from "fs";
import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { pipeline } from "stream";
import util from "util";
import { serve } from "@hono/node-server";
import { bearerAuth } from "hono/bearer-auth";
import { execa } from "execa";
import { Upload } from "@aws-sdk/lib-storage";
import { stat, rm, readFile } from "fs/promises";
import { UTApi } from "uploadthing/server";

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

const videoUploadedQueue = new Queue("videoUploaded", {
  connection: {
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    password: env.REDIS_PASSWORD,
  },
});

const videoUploadedWorker = new Worker(
  "videoUploaded",
  async (job) => {
    const start = Date.now();

    const videoId = job.data.videoId;

    console.log("Transcoding video ", videoId);

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
      Key: `${videoData.key}-processing`,
    });

    const data = await s3VideosClient.send(getObjectCommand);

    await pipelineAsync(data.Body as any, file);

    await execa("ffmpeg", [
      "-i",
      downloadId,
      "-vf",
      "scale=320:240",
      "-frames:v",
      "1",
      `${downloadId}-thumbnail-small.jpg`,
    ]);

    await execa("ffmpeg", [
      "-i",
      downloadId,
      "-vf",
      "scale=1920:1080",
      "-frames:v",
      "1",
      `${downloadId}-thumbnail-large.jpg`,
    ]);

    const smallThumbnailBuffer = await readFile(`${downloadId}-thumbnail-small.jpg`);
    const smallThumbnailFile = new File(
      [smallThumbnailBuffer],
      `${videoData.key}-thumbnail-small.jpg`,
      { type: "image/jpeg" },
    );

    const largeThumbnailBuffer = await readFile(`${downloadId}-thumbnail-large.jpg`);
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

    await execa(`ffmpeg`, [
      "-i",
      downloadId,
      "-vcodec",
      "libx264",
      "-crf",
      "27",
      "-preset",
      "medium",
      "-c:a",
      "copy",
      `${downloadId}-transcoded.mp4`,
    ]);

    let fileSizeBytes = undefined;

    try {
      const stats = await stat(`${downloadId}-transcoded.mp4`);
      fileSizeBytes = stats.size;
    } catch {
      console.log("Failed to get file size");
    }

    const videoUpload = new Upload({
      client: s3VideosClient,
      params: {
        Bucket: env.S3_VIDEOS_BUCKET,
        Key: `${videoId}`,
        Body: createReadStream(`${downloadId}-transcoded.mp4`),
      },
    });

    videoUpload.on("httpUploadProgress", (progress) => {
      console.log(`Uploaded: ${progress.loaded} of ${progress.total} bytes`);
    });

    await videoUpload.done();

    await db
      .update(videos)
      .set({
        isProcessing: false,
        smallThumbnailUrl: smallThumbnailUrl,
        largeThumbnailUrl: largeThumbnailUrl,
        fileSizeBytes,
      })
      .where(eq(videos.id, videoId));

    console.log("Cleaning up files");

    try {
      const deleteOldVideoCommand = new DeleteObjectCommand({
        Bucket: env.S3_VIDEOS_BUCKET,
        Key: `${videoData.key}-processing`,
      });

      await Promise.all([
        s3VideosClient.send(deleteOldVideoCommand),
        rm(`${downloadId}-thumbnail-small.jpg`),
        rm(`${downloadId}-thumbnail-large.jpg`),
        rm(`${downloadId}-transcoded.mp4`),
        rm(downloadId),
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

api.use("/api/*", bearerAuth({ token: env.API_SECRET }));

api.get("/hc", (c) => c.text("Hono!"));

api.put("/api/video", async (c) => {
  const { videoId } = await c.req.json();

  if (!videoId) {
    c.status(400);
    return c.text("bad request");
  }

  await videoUploadedQueue.add("transcode", { videoId });

  c.status(200);
  return c.text("New video added to queue");
});

serve({ ...api, port: Number(env.API_PORT), hostname: env.API_HOST }, (info) => {
  console.log(`Listening on ${env.API_PROTOCOL}://${env.API_HOST}:${info.port}`);
});
