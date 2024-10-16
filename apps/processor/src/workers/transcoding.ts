import { Worker } from "bullmq";
import { env } from "env/processor";
import { createReadStream, createWriteStream, existsSync, rmSync } from "fs";
import { mkdir, rm, stat } from "fs/promises";
import path from "path";
import { logger } from "../logger.js";
import {
  authorizeDownloadAccount,
  authorizeUploadAccount,
  getAuthorizedDownload,
  getUploadUrl,
  type AuthorizeAccountResponse,
  type DownloadAuthorizationResponse,
  type UploadUrlResponse,
} from "../util/backblaze.js";
import axios, { AxiosError } from "axios";
import type { Stream } from "stream";
import * as stream from "stream";
import { promisify } from "util";
import { execa } from "execa";
import { db, eq, videos } from "db";
import { generateSmallerResolutions, getVideoFileBitrate } from "../util/video.js";

type VideoSource = {
  key: string;
  type: string;
  width?: number;
  height?: number;
  bitrate?: number;
  isNative: boolean;
};

const finished = promisify(stream.finished);

export const transcoderWorker = new Worker<{ videoId: string; nativeFileKey: string }>(
  "{transcoding}",
  async (job) => {
    const jobStart = Date.now();

    const jobLogger = logger.child({ jobId: job.id, jobQueue: "{transcoding}", jobData: job.data });

    jobLogger.info("Starting transcoding job");

    jobLogger.info("Getting video data from database");
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

    jobLogger.info("Video data found");
    const workingTempDir = path.join(process.cwd(), "temp", `transcoding-${job.id}`);
    jobLogger.info(`Using temp directory "${workingTempDir}"`);

    if (existsSync(workingTempDir)) {
      try {
        await rm(workingTempDir, { recursive: true, force: true });
      } catch (e) {
        jobLogger.error(
          e,
          "An error occured when trying to remove existing temp working directory",
        );

        throw e;
      }
    }

    jobLogger.info("Creating temp directory");
    await mkdir(workingTempDir);
    jobLogger.info("Created temp directory");

    jobLogger.info("Sending authorize account request to Backblaze");
    let authorizedAccount: AuthorizeAccountResponse | undefined = undefined;

    try {
      const response = await authorizeDownloadAccount();
      authorizedAccount = response.data;
    } catch (e) {
      if (e instanceof AxiosError) {
        jobLogger.error(
          {
            statusCode: e?.response?.status,
            body: e?.response?.data,
            name: e.name,
            cause: e.cause,
          },
          "An error occured while authorizing account",
        );
        throw e;
      } else {
        jobLogger.error(e, "An error occured while authorizing account");
        throw e;
      }
    }
    jobLogger.info("Authorized account success");

    jobLogger.info("Sending authorize download request to Backblaze");
    let authorizedDownload: DownloadAuthorizationResponse | undefined = undefined;

    try {
      const authorizeDownloadResponse = await getAuthorizedDownload(authorizedAccount, {
        bucketId: env.VIDEOS_BUCKET_ID,
        fileNamePrefix: job.data.nativeFileKey,
        validDurationInSeconds: 360000,
      });

      authorizedDownload = authorizeDownloadResponse.data;
    } catch (e) {
      if (e instanceof AxiosError) {
        jobLogger.error(
          {
            statusCode: e?.response?.status,
            body: e?.response?.data,
            name: e.name,
            cause: e.cause,
          },
          "An error occured while authorizing download",
        );
        throw e;
      } else {
        jobLogger.error(e, "An error occured while authorizing download");
        throw e;
      }
    }

    jobLogger.info("Authorized download success");

    const nativeFilePath = path.join(workingTempDir, job.data.nativeFileKey);
    const writer = createWriteStream(nativeFilePath);

    const downloadUrl = `${authorizedAccount.apiInfo.storageApi.apiUrl}/file/${authorizedAccount.apiInfo.storageApi.bucketName}/${job.data.nativeFileKey}?Authorization=${encodeURIComponent(authorizedDownload.authorizationToken)}&b2ContentDisposition=attachment&b2ContentType=${encodeURIComponent("video/mp4")}`;

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

    const timeInSeconds = (Date.now() - downloadStartTime) / 1000;
    jobLogger.info(
      {
        timeInSeconds,
      },
      `Finished downloading native file in ${timeInSeconds} seconds`,
    );

    const { all: nativeFileMimeType } = await execa({
      all: true,
    })`file -b --mime-type ${nativeFilePath}`;

    jobLogger.info({ nativeFileMimeType }, `Native file mime type is ${nativeFileMimeType}`);

    const { all: nativeFileResolution } = await execa({
      all: true,
    })`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 ${nativeFilePath}`;

    const [nativeFileWidthString, nativeFileHeightString] = nativeFileResolution.split("x");

    const nativeFileWidth = Number(nativeFileWidthString);
    const nativeFileHeight = Number(nativeFileHeightString);

    jobLogger.info(
      {
        nativeFileWidth,
        nativeFileHeight,
      },
      `Native file's resolution is ${nativeFileResolution}`,
    );

    const videoSources: VideoSource[] = [
      {
        key: job.data.nativeFileKey,
        type: nativeFileMimeType,
        width: nativeFileWidth,
        height: nativeFileHeight,
        isNative: true,
        bitrate: await getVideoFileBitrate(nativeFilePath),
      },
    ];

    const resolutionsToGenerate = generateSmallerResolutions({
      width: nativeFileWidth,
      height: nativeFileHeight,
    });

    const { all: nativeFileFrameRateFraction } = await execa({
      all: true,
    })`ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of default=noprint_wrappers=1:nokey=1 ${nativeFilePath}`;

    const videoFrameRateDecimal = eval(nativeFileFrameRateFraction).toFixed(2);

    jobLogger.info(
      {
        frameRate: videoFrameRateDecimal,
      },
      `Video's frame rate is ${videoFrameRateDecimal}`,
    );

    for (const resolution of resolutionsToGenerate) {
      const start = Date.now();
      jobLogger.info(`Generating video source for ${resolution.height}p`, {
        resolution,
      });

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

      const outPath = path.join(workingTempDir, `${resolution.height}p.mp4`);

      const command = `ffmpeg -i ${nativeFilePath} -c:v libx264 -pix_fmt yuv420p -crf ${crf} -preset ${ffmpegPresetOption} -tune zerolatency -c:a aac -vf scale=${resolution.width}:${resolution.height} ${outPath}`;

      await execa`${command}`;

      const elapsed = (Date.now() - start) / 1000;
      jobLogger.info(
        {
          resolution,
          elapsed,
        },
        `Finished generating video source for ${resolution.height}p in ${elapsed}s`,
      );

      jobLogger.info(
        {
          resolution,
        },
        "Getting upload url for Backblaze",
      );

      let uploadUrlResponse: UploadUrlResponse | undefined = undefined;

      try {
        jobLogger.info("Sending authorize upload account request to Backblaze");
        let authorizedUploadAccount: AuthorizeAccountResponse | undefined = undefined;

        try {
          const response = await authorizeUploadAccount();
          authorizedUploadAccount = response.data;
        } catch (e) {
          if (e instanceof AxiosError) {
            jobLogger.error(
              {
                statusCode: e?.response?.status,
                body: e?.response?.data,
                name: e.name,
                cause: e.cause,
              },
              "An error occured while authorizing upload account",
            );
            throw e;
          } else {
            jobLogger.error(e, "An error occured while authorizing upload account");
            throw e;
          }
        }
        jobLogger.info("Authorized account success");

        uploadUrlResponse = (await getUploadUrl(authorizedUploadAccount, env.VIDEOS_BUCKET_ID))
          .data;
      } catch (e) {
        if (e instanceof AxiosError) {
          jobLogger.error(
            {
              resolution,
              statusCode: e?.response?.status,
              body: e?.response?.data,
              name: e.name,
              cause: e.cause,
            },
            "An error occured while getting upload url",
          );
          throw e;
        } else {
          jobLogger.error(e, "An error occured while getting upload url");
          throw e;
        }
      }

      const processedFileStats = await stat(outPath);

      jobLogger.info(
        { resolution, contentLength: processedFileStats.size },
        `Uploading ${processedFileStats.size} bytes`,
      );

      jobLogger.info({ resolution }, "Uploading processed file to url");

      const fileStream = createReadStream(outPath);

      const bucketFileName = `${videoData.nativeFileKey}-${resolution.height}p.mp4`;

      try {
        const uploadStart = Date.now();
        await axios(uploadUrlResponse.uploadUrl, {
          onUploadProgress: (e) => {
            const percentDone = (e.progress ?? 0) * 100;
            jobLogger.info(
              { resolution, percentDone },
              `Uploading file ${percentDone}% done of ${processedFileStats.size} bytes`,
            );
          },
          method: "POST",
          data: fileStream,
          headers: {
            "Content-Type": "video/mp4",
            Authorization: uploadUrlResponse.authorizationToken,
            "X-Bz-File-Name": bucketFileName,
            "X-Bz-Content-Sha1": "do_not_verify",
            "Content-Length": processedFileStats.size,
          },
        });

        const uploadTimeElapsed = (Date.now() - uploadStart) / 1000;
        jobLogger.info(
          { resolution, elapsed: uploadTimeElapsed },
          `Finished uploading ${resolution.height}p processed video in ${uploadTimeElapsed} seconds`,
        );
      } catch (e) {
        if (e instanceof AxiosError) {
          jobLogger.error(
            {
              resolution,
              statusCode: e?.response?.status,
              body: e?.response?.data,
              name: e.name,
              cause: e.cause,
            },
            "An error occured uploading processed file to url",
          );
          throw e;
        } else {
          jobLogger.error(e, "An error occured uploading processed file to url");
          throw e;
        }
      }

      const { all: transcodedFileBitRateString } = await execa({
        all: true,
      })`ffprobe -v error -select_streams v:0 -show_entries stream=bit_rate -of default=noprint_wrappers=1:nokey=1 ${outPath}`;

      const transcodedFileBitRate = parseInt(transcodedFileBitRateString);

      videoSources.push({
        key: bucketFileName,
        type: "video/mp4",
        isNative: false,
        bitrate: await getVideoFileBitrate(outPath),
        ...resolution,
      });
    }

    jobLogger.info({ videoSources }, "Generated sources for video");

    jobLogger.info("Adding video sources to database");

    await db
      .update(videos)
      .set({
        sources: videoSources,
        isProcessing: false,
      })
      .where(eq(videos.id, videoData.id));

    jobLogger.info("Removing files from disk");

    await rm(workingTempDir, { force: true, recursive: true });

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

transcoderWorker.on("failed", (job, err) => {
  logger.error(
    {
      jobQueue: job?.queueName,
      jobId: job?.id,
      name: job?.name,
      jobData: job?.data,
      failedReason: job?.failedReason,
      stackTrace: job?.stacktrace,
      errorMessage: err.message,
      errorStack: err.stack,
      errorCause: err.cause,
    },
    "Transcoding job failed",
  );
});

transcoderWorker.on("completed", (job, result) => {
  logger.info(
    { jobQueue: job.queueName, jobId: job?.id, name: job?.name, jobData: job?.data, result },
    "Transcoding job completed",
  );
});
