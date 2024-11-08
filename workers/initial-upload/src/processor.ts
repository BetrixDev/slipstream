import { Job, Worker } from "bullmq";
import { logger } from "./log.js";
import { db, eq, videos } from "db";
import path from "path";
import { createWriteStream } from "fs";
import axios, { AxiosError } from "axios";
import type { Stream } from "stream";
import {
  authorizeDownloadAccount,
  authorizeThumbnailUploadAccount,
  getAuthorizedDownload,
  getUploadUrl,
  type AuthorizeAccountResponse,
  type DownloadAuthorizationResponse,
  type UploadUrlResponse,
} from "./backblaze.js";
import { env } from "./env.js";
import { promisify } from "util";
import * as stream from "stream";
import { execa } from "execa";
import { glob } from "glob";
import sharp from "sharp";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { rimraf } from "rimraf";

const finished = promisify(stream.finished);

async function createTempDirectory() {
  const path = await mkdtemp(tmpdir());

  return {
    path,
    [Symbol.asyncDispose]: () => rimraf(path, { maxRetries: 10 }) as unknown as Promise<void>,
  };
}

export const processor = async (job: Job<{ videoId: string }>) => {
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

  await using workingTempDir = await createTempDirectory();
  jobLogger.debug(`Using temp directory "${workingTempDir.path}"`);

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

  const nativeFilePath = path.join(workingTempDir.path, videoData.nativeFileKey);
  const writer = createWriteStream(nativeFilePath);

  const downloadUrl = `${authorizedAccount.apiInfo.storageApi.apiUrl}/file/${authorizedAccount.apiInfo.storageApi.bucketName}/${videoData.nativeFileKey}?Authorization=${encodeURIComponent(authorizedDownload.authorizationToken)}&b2ContentDisposition=attachment&b2ContentType=${encodeURIComponent("video/mp4")}`;

  const downloadStartTime = Date.now();
  jobLogger.info("Starting native file download from Backblaze");
  await axios<Stream>(downloadUrl, {
    method: "GET",
    responseType: "stream",
  }).then((res) => {
    res.data.pipe(writer);
    return finished(writer);
  });

  const downloadTimeInSeconds = (Date.now() - downloadStartTime) / 1000;
  jobLogger.info(`Finished downloading native file in ${downloadTimeInSeconds} seconds`, {
    timeInSeconds: downloadTimeInSeconds,
  });

  await execa`ffmpeg -i ${nativeFilePath} -vf fps=0.25 -vframes 4 ${nativeFilePath}_%04d.jpg`;

  jobLogger.debug("Frames glob", { glob: "*_*.jpg", cwd: workingTempDir });

  const frames = await glob("*_*.jpg", { cwd: workingTempDir.path });

  jobLogger.debug("Frames found", { frames });

  let brightestFrame = { file: frames.at(0), brightness: 0 };

  for (const frame of frames) {
    try {
      const { data } = await sharp(path.join(workingTempDir.path, frame))
        .grayscale()
        .raw()
        .toBuffer({
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
      jobLogger.error("Error processing frame", e);
    }
  }

  jobLogger.debug("Brightess Frame", brightestFrame);

  let image: sharp.Sharp;

  if (brightestFrame.file !== undefined) {
    image = sharp(path.join(workingTempDir.path, brightestFrame.file));
  } else {
    // Create a black thumbnail if no frames could be extracted from video
    image = sharp({
      create: { height: 720, width: 1280, channels: 3, background: { r: 0, g: 0, b: 0 } },
    });
  }

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

  jobLogger.debug("Checking that video wasn't deleted before uploading files");

  const videoExists =
    (await db.query.videos.findFirst({
      where: (table, { eq }) => eq(table.id, videoData.id),
    })) !== undefined;

  if (!videoExists) {
    jobLogger.debug("Video was deleted, exiting early");
    return;
  }

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

      uploadUrlResponse = (await getUploadUrl(authorizedUploadAccount, env.THUMBS_BUCKET_ID)).data;
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

  let videoDurationSeconds: number | undefined = undefined;

  try {
    jobLogger.debug("Getting video length");

    const { all } = await execa({
      all: true,
    })`ffprobe -i ${nativeFilePath} -show_entries format=duration -v quiet -of csv=p=0`;

    videoDurationSeconds = Math.round(Number(all.trim()));
  } catch (e) {
    jobLogger.error("Error geting video length", e);
  }

  jobLogger.info(
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
      videoLengthSeconds: videoDurationSeconds,
    } as any)
    .where(eq(videos.id, videoData.id));

  jobLogger.info("Removing files from disk");

  return {
    elapsed: (Date.now() - jobStart) / 1000,
  };
};
