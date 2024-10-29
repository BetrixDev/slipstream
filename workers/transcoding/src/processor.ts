import { Job, Worker } from "bullmq";
import { env } from "env/worker/transcoding";
import { createReadStream, createWriteStream } from "fs";
import { stat } from "fs/promises";
import path, { parse } from "path";
import { logger } from "./log.js";
import {
  authorizeDownloadAccount,
  authorizeVideoUploadAccount,
  getAuthorizedDownload,
  getUploadUrl,
  type AuthorizeAccountResponse,
  type DownloadAuthorizationResponse,
  type UploadUrlResponse,
} from "./backblaze.js";
import axios, { AxiosError } from "axios";
import type { Stream } from "stream";
import * as stream from "stream";
import { promisify } from "util";
import { execa } from "execa";
import { db, eq, videos } from "db";
import { generateSmallerResolutions, getVideoFileBitrate, shouldKeepTranscoding } from "./video.js";
import { createTempDirectory } from "flowble-util/fs";

type VideoSource = {
  key: string;
  type: string;
  width?: number;
  height?: number;
  bitrate?: number;
  isNative: boolean;
};

const finished = promisify(stream.finished);

export default async (job: Job<{ videoId: string; nativeFileKey: string }>) => {
  const jobStart = Date.now();

  const jobLogger = logger.child({ jobId: job.id, jobQueue: "{transcoding}", jobData: job.data });

  jobLogger.info("Starting transcoding job");

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
  await using workingTempDir = await createTempDirectory();
  jobLogger.debug(`Using temp directory "${workingTempDir.path}"`);

  jobLogger.debug("Sending authorize account request to Backblaze");
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
      throw new Error(e.message);
    } else {
      jobLogger.error("An error occured while authorizing account", e);
      throw new Error();
    }
  }
  jobLogger.debug("Authorized account success");

  jobLogger.debug("Sending authorize download request to Backblaze");
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
      jobLogger.error("An error occured while authorizing download", {
        statusCode: e?.response?.status,
        body: e?.response?.data,
        name: e.name,
        cause: e.cause,
      });
      throw new Error(e.message);
    } else {
      jobLogger.error("An error occured while authorizing download", e);
      throw new Error();
    }
  }

  jobLogger.debug("Authorized download success");

  const nativeFilePath = path.join(workingTempDir.path, job.data.nativeFileKey);
  const writer = createWriteStream(nativeFilePath);

  const downloadUrl = `${authorizedAccount.apiInfo.storageApi.apiUrl}/file/${authorizedAccount.apiInfo.storageApi.bucketName}/${job.data.nativeFileKey}?Authorization=${encodeURIComponent(authorizedDownload.authorizationToken)}&b2ContentDisposition=attachment&b2ContentType=${encodeURIComponent("video/mp4")}`;

  const downloadStartTime = Date.now();
  jobLogger.debug("Starting native file download from Backblaze", {
    url: downloadUrl,
  });
  await axios<Stream>(downloadUrl, {
    method: "GET",
    responseType: "stream",
    onDownloadProgress: (e) => {
      const percentage = e.total ? Math.floor((e.loaded / e.total) * 100) : null;
      jobLogger.debug(
        `Downloaded ${percentage}% of file, estimated ${e.estimated} seconds remain going at ${e.rate} bytes/s`,
      );
    },
  }).then((res) => {
    res.data.pipe(writer);
    return finished(writer);
  });

  const timeInSeconds = (Date.now() - downloadStartTime) / 1000;
  jobLogger.info(`Finished downloading native file in ${timeInSeconds} seconds`, {
    timeInSeconds,
  });

  const { all: nativeFileMimeType } = await execa({
    all: true,
  })`file -b --mime-type ${nativeFilePath}`;

  jobLogger.info(`Native file mime type is ${nativeFileMimeType}`, { nativeFileMimeType });

  const { all: nativeFileResolution } = await execa({
    all: true,
  })`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 ${nativeFilePath}`;

  const [nativeFileWidthString, nativeFileHeightString] = nativeFileResolution.split("x");

  const nativeFileWidth = Number(nativeFileWidthString);
  const nativeFileHeight = Number(nativeFileHeightString);

  jobLogger.info(`Native file's resolution is ${nativeFileResolution}`, {
    nativeFileWidth,
    nativeFileHeight,
  });

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

  function shouldTranscode() {
    return shouldKeepTranscoding(videoSources.at(-1)?.bitrate ?? 0);
  }

  const resolutionsToGenerate = generateSmallerResolutions({
    width: nativeFileWidth,
    height: nativeFileHeight,
  });

  const { all: nativeFileFrameRateFraction } = await execa({
    all: true,
  })`ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of default=noprint_wrappers=1:nokey=1 ${nativeFilePath}`;

  const [top, bottom] = nativeFileFrameRateFraction.split("/");

  const videoFrameRateDecimal = (parseFloat(top) / parseFloat(bottom)).toFixed(2);

  jobLogger.debug(`Video's frame rate is ${videoFrameRateDecimal}`, {
    frameRate: videoFrameRateDecimal,
  });

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

    const outPath = path.join(workingTempDir.path, `${resolution.height}p.mp4`);

    const command = `ffmpeg -i ${nativeFilePath} -c:v libx264 -pix_fmt yuv420p -crf ${crf} -preset ${ffmpegPresetOption} -tune zerolatency -c:a aac -vf scale=${resolution.width}:${resolution.height} ${outPath}`;

    await execa`${command}`;

    const elapsed = (Date.now() - start) / 1000;
    jobLogger.debug(`Finished generating video source for ${resolution.height}p in ${elapsed}s`, {
      resolution,
      elapsed,
    });

    jobLogger.debug("Checking that video wasn't deleted before uploading files");

    const videoExists =
      (await db.query.videos.findFirst({
        where: (table, { eq }) => eq(table.id, videoData.id),
      })) !== undefined;

    if (!videoExists) {
      jobLogger.debug("Video was deleted, exiting early");
      return;
    }

    jobLogger.debug("Getting upload url for Backblaze", {
      resolution,
    });

    let uploadUrlResponse: UploadUrlResponse | undefined = undefined;

    try {
      jobLogger.debug("Sending authorize upload account request to Backblaze");
      let authorizedUploadAccount: AuthorizeAccountResponse | undefined = undefined;

      try {
        const response = await authorizeVideoUploadAccount();
        authorizedUploadAccount = response.data;
      } catch (e) {
        if (e instanceof AxiosError) {
          jobLogger.error("An error occured while authorizing upload account", {
            statusCode: e?.response?.status,
            body: e?.response?.data,
            name: e.name,
            cause: e.cause,
          });
          throw new Error(e.message);
        } else {
          jobLogger.error("An error occured while authorizing upload account", e);
          throw new Error();
        }
      }
      jobLogger.debug("Authorized account success");

      uploadUrlResponse = (await getUploadUrl(authorizedUploadAccount, env.VIDEOS_BUCKET_ID)).data;
    } catch (e) {
      if (e instanceof AxiosError) {
        jobLogger.error("An error occured while getting upload url", {
          resolution,
          statusCode: e?.response?.status,
          body: e?.response?.data,
          name: e.name,
          cause: e.cause,
        });
        throw new Error(e.message);
      } else {
        jobLogger.error("An error occured while getting upload url", e);
        throw new Error();
      }
    }

    const processedFileStats = await stat(outPath);

    jobLogger.debug(`Uploading ${processedFileStats.size} bytes`, {
      resolution,
      contentLength: processedFileStats.size,
    });

    jobLogger.debug("Uploading processed file to url", { resolution });

    const fileStream = createReadStream(outPath);

    const bucketFileName = `${videoData.nativeFileKey}-${resolution.height}p.mp4`;

    try {
      const uploadStart = Date.now();
      await axios(uploadUrlResponse.uploadUrl, {
        onUploadProgress: (e) => {
          const percentDone = (e.progress ?? 0) * 100;
          jobLogger.info(
            `Uploading file ${percentDone}% done of ${processedFileStats.size} bytes`,
            { resolution, percentDone },
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
        `Finished uploading ${resolution.height}p processed video in ${uploadTimeElapsed} seconds`,
        { resolution, elapsed: uploadTimeElapsed },
      );
    } catch (e) {
      if (e instanceof AxiosError) {
        jobLogger.error("An error occured uploading processed file to url", {
          resolution,
          statusCode: e?.response?.status,
          body: e?.response?.data,
          name: e.name,
          cause: e.cause,
        });
        throw new Error(e.message);
      } else {
        jobLogger.error("An error occured uploading processed file to url", e);
        throw new Error();
      }
    }

    videoSources.push({
      key: bucketFileName,
      type: "video/mp4",
      isNative: false,
      bitrate: await getVideoFileBitrate(outPath),
      ...resolution,
    });

    if (!shouldTranscode()) {
      break;
    }
  }

  jobLogger.info("Generated sources for video", { videoSources });

  jobLogger.debug("Adding video sources to database");

  await db
    .update(videos)
    .set({
      sources: videoSources,
      isProcessing: false,
    } as any)
    .where(eq(videos.id, videoData.id));

  return {
    elapsed: (Date.now() - jobStart) / 1000,
  };
};
