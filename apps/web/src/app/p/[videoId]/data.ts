import "server-only";

import { env } from "@/env";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Redis } from "@upstash/redis";
import { db } from "db";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

const redis = new Redis({
  url: process.env.REDIS_REST_URL,
  token: process.env.REDIS_REST_TOKEN,
});

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ROOT_ACCESS_KEY!,
    secretAccessKey: process.env.S3_ROOT_SECRET_KEY!,
  },
});

export async function getVideoData(videoId: string) {
  const cachedVideoData = await redis.hgetall<
    Omit<Awaited<ReturnType<typeof getVideoDataFromDb>>, "videoSources">
  >(`video:${videoId}`);

  if (cachedVideoData) {
    return {
      ...cachedVideoData,
      videoSources: await generateVideoSources(cachedVideoData.videoData),
    };
  } else {
    const videoData = await getVideoDataFromDb(videoId);

    redis.hset(`video:${videoId}`, videoData).then(() => {
      redis.expire(`video:${videoId}`, 60 * 60 * 24);
    });

    return {
      ...videoData,
      videoSources: await generateVideoSources(videoData.videoData),
    };
  }
}

async function generateVideoSources(
  videoData: Awaited<ReturnType<typeof getVideoDataFromDb>>["videoData"],
) {
  return await Promise.all(
    videoData.sources.map(async (source) => {
      const url = await getSignedUrl(
        s3Client,
        new GetObjectCommand({ Bucket: env.VIDEOS_BUCKET_NAME, Key: source.key }),
        { expiresIn: 60 * 60 * 24 * 7 },
      );

      return {
        src: url,
        type: source.type,
        width: source.width,
        height: source.height,
        isNative: source.isNative,
      };
    }),
  );
}

async function getVideoDataFromDb(videoId: string) {
  const videoData = await db.query.videos.findFirst({
    where: (table, { eq }) => eq(table.id, videoId),
    columns: {
      title: true,
      views: true,
      isPrivate: true,
      authorId: true,
      isProcessing: true,
      largeThumbnailKey: true,
      videoLengthSeconds: true,
      createdAt: true,
      sources: true,
    },
  });

  if (!videoData) {
    return notFound();
  }

  const largeThumbnailUrl =
    videoData.largeThumbnailKey && `${env.THUMBNAIL_BASE_URL}/${videoData.largeThumbnailKey}`;

  const videoCreatedAt = videoData.createdAt.toString();

  return {
    videoData: {
      title: videoData.title,
      isPrivate: videoData.isPrivate,
      videoLengthSeconds: videoData.videoLengthSeconds,
      isProcessing: videoData.isProcessing,
      views: videoData.views,
      largeThumbnailKey: videoData.largeThumbnailKey,
      authorId: videoData.authorId,
      sources: videoData.sources,
    },
    largeThumbnailUrl,
    videoCreatedAt,
  };
}

export async function getIp() {
  const requestHeaders = await headers();

  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const realIp = requestHeaders.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  } else if (realIp) {
    return realIp.trim();
  }

  return null;
}
