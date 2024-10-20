import { Worker } from "bullmq";
import { logger } from "../logger.js";
import { db, eq, videos } from "db";
import path from "path";
import { createWriteStream, existsSync } from "fs";
import { mkdir, rm } from "fs/promises";
import axios, { AxiosError } from "axios";
import type { Stream } from "stream";
import {
  authorizeDownloadAccount,
  authorizeThumbnailUploadAccount,
  authorizeVideoUploadAccount,
  getAuthorizedDownload,
  getUploadUrl,
  type AuthorizeAccountResponse,
  type DownloadAuthorizationResponse,
  type UploadUrlResponse,
} from "../util/backblaze.js";
import { env } from "env/processor";
import { promisify } from "util";
import * as stream from "stream";
import { execa } from "execa";
import { glob } from "glob";
import sharp from "sharp";
import { rimraf } from "rimraf";

const finished = promisify(stream.finished);

export const thumbnailWorker = new Worker<{ videoId: string }>(
  "{thumbnail}",
  async (job) => {
    const jobStart = Date.now();
    sharp.cache(false);

    const jobLogger = logger.child({ jobId: job.id, jobQueue: "{thumbnail}", jobData: job.data });

    jobLogger.info("Starting thumbnail job");

    jobLogger.debug("Getting video data from database");
    const videoData = await db.query.videos.findFirst({
      where: (table, { eq }) => eq(table.id, job.data.videoId),
      with: {
        author: {
          columns: {
            accountTier: true,
          },
        },
      },
    });

    if (!videoData) {
      jobLogger.error("Video data not found in database");
      throw new Error(`Video with id ${job.data.videoId} not found`);
    }

    jobLogger.debug("Video data found");
    const workingTempDir = path.join(process.cwd(), "temp", `thumbnail-${job.id}`);
    jobLogger.debug(`Using temp directory "${workingTempDir}"`);

    if (existsSync(workingTempDir)) {
      try {
        await rm(workingTempDir, { recursive: true, force: true });
      } catch (e) {
        jobLogger.error(
          "An error occured when trying to remove existing temp working directory",
          e,
        );

        throw e;
      }
    }

    jobLogger.debug("Creating temp directory");
    await mkdir(workingTempDir);
    jobLogger.debug("Created temp directory");

    jobLogger.info("Sending authorize account request to Backblaze");
    let authorizedAccount: AuthorizeAccountResponse | undefined = undefined;

    try {
      const response = await authorizeDownloadAccount();
      authorizedAccount = response.data;
    } catch (e) {
      if (e instanceof AxiosError) {
        jobLogger.error("An error occured while authorizing account", {
          statusCode: e?.response?.status,
          body: e?.response?.data,
          name: e.name,
          cause: e.cause,
        });
        throw e;
      } else {
        jobLogger.error("An error occured while authorizing account", e);
        throw e;
      }
    }
    jobLogger.info("Authorized account success");

    jobLogger.info("Sending authorize download request to Backblaze");
    let authorizedDownload: DownloadAuthorizationResponse | undefined = undefined;

    try {
      const authorizeDownloadResponse = await getAuthorizedDownload(authorizedAccount, {
        bucketId: env.VIDEOS_BUCKET_ID,
        fileNamePrefix: videoData.nativeFileKey,
        validDurationInSeconds: 360000,
      });

      authorizedDownload = authorizeDownloadResponse.data;
    } catch (e) {
      if (e instanceof AxiosError) {
        jobLogger.error("An error occured while authorizing download", {
          statusCode: e?.response?.status,
          body: e?.response?.data,
          name: e.name,
          cause: e.cause,
        });
        throw e;
      } else {
        jobLogger.error("An error occured while authorizing download", e);
        throw e;
      }
    }

    jobLogger.info("Authorized download success");

    const nativeFilePath = path.join(workingTempDir, videoData.nativeFileKey);
    const writer = createWriteStream(nativeFilePath);

    const downloadUrl = `${authorizedAccount.apiInfo.storageApi.apiUrl}/file/${authorizedAccount.apiInfo.storageApi.bucketName}/${videoData.nativeFileKey}?Authorization=${encodeURIComponent(authorizedDownload.authorizationToken)}&b2ContentDisposition=attachment&b2ContentType=${encodeURIComponent("video/mp4")}`;

    const downloadStartTime = Date.now();
    jobLogger.info("Starting native file download from Backblaze");
    await axios<Stream>(downloadUrl, {
      method: "GET",
      responseType: "stream",
      onDownloadProgress: (e) => {
        const percentage = e.total ? Math.floor((e.loaded / e.total) * 100) : null;
        jobLogger.info(
          `Downloaded ${percentage}% of file, estimated ${e.estimated} seconds remain going at ${e.rate} bytes/s`,
        );
      },
    }).then((res) => {
      res.data.pipe(writer);
      return finished(writer);
    });

    const downloadTimeInSeconds = (Date.now() - downloadStartTime) / 1000;
    jobLogger.info(`Finished downloading native file in ${downloadTimeInSeconds} seconds`, {
      timeInSeconds: downloadTimeInSeconds,
    });

    await execa`ffmpeg -i ${nativeFilePath} -vf fps=0.25 ${nativeFilePath}_%04d.jpg`;

    logger.debug("Frames glob", { glob: "*_*.jpg", cwd: workingTempDir });

    const frames = await glob("*_*.jpg", { cwd: workingTempDir });

    logger.debug("Frames found", { frames });

    let brightestFrame = { file: frames[0], brightness: 0 };

    for (const frame of frames) {
      try {
        const { data } = await sharp(path.join(workingTempDir, frame)).grayscale().raw().toBuffer({
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
      } catch (e) {
        logger.error("Error processing frame", e);
      }
    }

    logger.debug("Brightess Frame", brightestFrame);

    console.log(path.join(workingTempDir, brightestFrame.file));

    const image = sharp(path.join(workingTempDir, brightestFrame.file));

    const smallThumbnailBuffer = await image
      .resize(1280, 720, { fit: "cover" })
      .webp({ quality: 65, effort: 6, lossless: false, alphaQuality: 80 })
      .toBuffer();

    const largeThumbnailBuffer = await image
      .webp({ quality: 90, effort: 6, alphaQuality: 90 })
      .toBuffer();

    const thumbnails: Record<string, string | undefined> = {
      small: undefined,
      large: undefined,
    };

    for (const thumb of [
      { name: `${videoData.nativeFileKey}-small.webp`, buffer: smallThumbnailBuffer },
      { name: `${videoData.nativeFileKey}-large.webp`, buffer: largeThumbnailBuffer },
    ]) {
      jobLogger.info("Getting upload url for Backblaze", {
        thumbNail: thumb.name,
      });

      let uploadUrlResponse: UploadUrlResponse | undefined = undefined;

      try {
        jobLogger.info("Sending authorize upload account request to Backblaze");
        let authorizedUploadAccount: AuthorizeAccountResponse | undefined = undefined;

        try {
          const response = await authorizeThumbnailUploadAccount();
          authorizedUploadAccount = response.data;
        } catch (e) {
          if (e instanceof AxiosError) {
            jobLogger.error("An error occured while authorizing upload account", {
              statusCode: e?.response?.status,
              body: e?.response?.data,
              name: e.name,
              cause: e.cause,
            });
            throw e;
          } else {
            jobLogger.error("An error occured while authorizing upload account", e);
            throw e;
          }
        }
        jobLogger.info("Authorized account success");

        uploadUrlResponse = (await getUploadUrl(authorizedUploadAccount, env.THUMBS_BUCKET_ID))
          .data;
      } catch (e) {
        if (e instanceof AxiosError) {
          jobLogger.error("An error occured while getting upload url", {
            thumbnailName: thumb.name,
            statusCode: e?.response?.status,
            body: e?.response?.data,
            name: e.name,
            cause: e.cause,
          });
          throw e;
        } else {
          jobLogger.error("An error occured while getting upload url", e);
          throw e;
        }
      }

      const thumbnailSize = thumb.buffer.byteLength;

      jobLogger.info(`Uploading ${thumbnailSize} bytes`, {
        thumbnailName: thumb.name,
        contentLength: thumbnailSize,
      });

      jobLogger.info("Uploading processed file to url", { thumbnailName: thumb.name });

      try {
        const uploadStart = Date.now();
        const uploadFileResponse = await axios(uploadUrlResponse.uploadUrl, {
          onUploadProgress: (e) => {
            const percentDone = (e.progress ?? 0) * 100;
            jobLogger.info(`Uploading file ${percentDone}% done of ${thumbnailSize} bytes`, {
              thumbnailName: thumb.name,
              percentDone,
            });
          },
          method: "POST",
          data: thumb.buffer,
          headers: {
            "Content-Type": "image/webp",
            Authorization: uploadUrlResponse.authorizationToken,
            "X-Bz-File-Name": thumb.name,
            "X-Bz-Content-Sha1": "do_not_verify",
            "Content-Length": thumbnailSize,
          },
        });

        const uploadTimeElapsed = (Date.now() - uploadStart) / 1000;
        jobLogger.info(`Finished uploading ${thumb.name} in ${uploadTimeElapsed} seconds`, {
          thumbnailName: thumb.name,
          elapsed: uploadTimeElapsed,
        });

        // resolve(uploadFileResponse.data);
        thumbnails[thumb.name.includes("small.webp") ? "small" : "large"] =
          uploadFileResponse.data.fileName;
      } catch (e) {
        if (e instanceof AxiosError) {
          jobLogger.error("An error occured uploading processed file to url", {
            thumbnailName: thumb.name,
            statusCode: e?.response?.status,
            body: e?.response?.data,
            name: e.name,
            cause: e.cause,
          });
          throw e;
        } else {
          jobLogger.error("An error occured uploading processed file to url", e);
          throw e;
        }
      }
    }

    logger.info(
      `Updating videos table with the following thumbnail data for video ${videoData.id}`,
      {
        thumbnails,
      },
    );

    await db
      .update(videos)
      .set({
        largeThumbnailKey: thumbnails.large,
        smallThumbnailKey: thumbnails.small,
      })
      .where(eq(videos.id, videoData.id));

    jobLogger.info("Removing files from disk");

    await rimraf(workingTempDir);

    return {
      elapsed: (Date.now() - jobStart) / 1000,
    };
  },
  {
    connection: {
      host: env.QUEUE_REDIS_HOST,
      port: Number(env.QUEUE_REDIS_PORT),
      password: env.QUEUE_REDIS_PASSWORD,
    },
    concurrency: 3,
  },
);

thumbnailWorker.on("failed", async (job, err) => {
  logger.error("Thumbnail job failed", {
    jobQueue: job?.queueName,
    jobId: job?.id,
    name: job?.name,
    jobData: job?.data,
    failedReason: job?.failedReason,
    stackTrace: job?.stacktrace,
    errorMessage: err.message,
    errorStack: err.stack,
    errorCause: err.cause,
  });

  try {
    await rimraf(path.join(process.cwd(), "temp", `thumbnail-${job?.id}`));
  } catch (e: any) {
    logger.warn("Error removing failed job directory for thumbnails", { jobId: job?.id, ...e });
  }
});

thumbnailWorker.on("completed", (job, result) => {
  logger.info("Thumbnail job completed", {
    jobQueue: job.queueName,
    jobId: job?.id,
    name: job?.name,
    jobData: job?.data,
    result,
  });
});
