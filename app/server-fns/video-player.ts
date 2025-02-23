import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { clerkClient } from "@clerk/tanstack-start/server";
import { Redis } from "@upstash/redis";
import { waitUntil } from "@vercel/functions";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { createSigner } from "fast-jwt";
import { createServerFn } from "@tanstack/start";
import { z } from "zod";
import { notFound } from "@tanstack/react-router";
import { getHeaders } from "@tanstack/start/server";

dayjs.extend(utc);

const redis = new Redis({
  url: process.env.REDIS_REST_URL,
  token: process.env.REDIS_REST_TOKEN,
});

const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ROOT_ACCESS_KEY,
    secretAccessKey: env.S3_ROOT_SECRET_KEY,
  },
});

export const getVideoDataServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ videoId: z.string() }))
  .handler(async ({ data }) => {
    const cachedVideoData = await redis.hgetall<
      Omit<Awaited<ReturnType<typeof getVideoDataFromDb>>, "videoSources">
    >(`video:${data.videoId}`);

    if (cachedVideoData) {
      return {
        ...cachedVideoData,
        videoSources: await generateVideoSources(cachedVideoData.videoData),
      };
    }

    const videoData = await getVideoDataFromDb(data.videoId);

    waitUntil(
      redis.hset(`video:${data.videoId}`, videoData).then(() => {
        redis.expire(`video:${data.videoId}`, 60 * 60 * 24);
      })
    );

    return {
      ...videoData,
      videoSources: await generateVideoSources(videoData.videoData),
    };
  });

export const createVideoTokenServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      videoId: z.string(),
      videoDuration: z.number(),
      userId: z.string().nullable().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ip = await getIp();

    const tokenIdentifier = ip ?? data.userId ?? data.videoId;

    const utcTimestamp = Math.round(dayjs.utc().valueOf() / 1000);

    const signSync = createSigner({
      key: process.env.TOKEN_SIGNING_SECRET,
      clockTimestamp: utcTimestamp,
    });

    const token = signSync({
      videoId: data.videoId,
      identifier: tokenIdentifier,
      videoDuration: data.videoDuration,
      iat: utcTimestamp,
    });

    return { token };
  });

async function generateVideoSources(
  videoData: Awaited<ReturnType<typeof getVideoDataFromDb>>["videoData"]
) {
  const sources = await Promise.all(
    videoData.sources.map(async (source) => {
      if (source.source === "ut") {
        return {
          src: source.url,
          isNative: source.isNative,
        };
      }

      const url = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: env.VIDEOS_BUCKET_NAME,
          Key: source.key,
        }),
        { expiresIn: 60 * 60 * 24 * 7 }
      );

      return {
        src: url,
        type: source.type,
        width: source.width,
        height: source.height,
        isNative: source.isNative,
      };
    })
  );

  return sources;
}

async function getVideoDataFromDb(videoId: string) {
  const videoData = await db.query.videos.findFirst({
    where: (table, { eq }) => eq(table.id, videoId),
    columns: {
      id: true,
      title: true,
      views: true,
      isPrivate: true,
      authorId: true,
      status: true,
      largeThumbnailKey: true,
      smallThumbnailKey: true,
      videoLengthSeconds: true,
      createdAt: true,
      sources: true,
      storyboardJson: true,
    },
  });

  if (!videoData) {
    throw notFound();
  }

  const largeThumbnailUrl =
    videoData.largeThumbnailKey &&
    `${env.THUMBNAIL_BASE_URL}/${videoData.largeThumbnailKey}`;

  const smallThumbnailUrl =
    videoData.smallThumbnailKey &&
    `${env.THUMBNAIL_BASE_URL}/${videoData.smallThumbnailKey}`;

  const videoCreatedAt = videoData.createdAt.toString();

  return {
    videoData: {
      title: videoData.title,
      isPrivate: videoData.isPrivate,
      videoLengthSeconds: videoData.videoLengthSeconds,
      isProcessing: videoData.status === "processing",
      views: videoData.views,
      largeThumbnailKey: videoData.largeThumbnailKey,
      smallThumbnailKey: videoData.smallThumbnailKey,
      authorId: videoData.authorId,
      sources: videoData.sources,
    },
    storyboard: videoData.storyboardJson
      ? {
          ...videoData.storyboardJson,
          url: `${env.THUMBNAIL_BASE_URL}/${videoData.id}-storyboard.jpg`,
        }
      : null,
    largeThumbnailUrl,
    smallThumbnailUrl,
    videoCreatedAt,
  };
}

export async function getVideoAuthorData(authorId: string) {
  const clerk = clerkClient({});

  const authorData = await clerk.users.getUser(authorId);

  return {
    username: authorData.username,
    profileImageUrl: authorData.imageUrl,
    accountTier: (authorData.publicMetadata.accountTier ?? "free") as string,
  };
}

export async function getIp() {
  const requestHeaders = getHeaders();

  const forwardedFor = requestHeaders["x-forwarded-for"];
  const realIp = requestHeaders["x-real-ip"];

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  return null;
}
