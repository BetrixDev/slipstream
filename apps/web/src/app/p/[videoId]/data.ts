import "server-only";

import { env } from "@/env";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Redis } from "@upstash/redis";
import { db } from "db";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { createSigner } from "fast-jwt";
import { clerkClient } from "@clerk/nextjs/server";

dayjs.extend(utc);

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

type VideoMetadata = {
  title: string;
  largeThumbnailKey: string | null;
  isPrivate: boolean;
  videoLengthSeconds?: number | null;
  source: {
    key: string;
    width?: number | null;
    height?: number | null;
    type: string;
  };
};

export async function getVideoMetaData(videoId: string) {
  let videoData = await redis.hgetall<VideoMetadata>(`videoMetadata:${videoId}`);

  if (!videoData) {
    const videoDbData = await db.query.videos.findFirst({
      where: (table, { eq }) => eq(table.id, videoId),
      columns: {
        title: true,
        largeThumbnailKey: true,
        sources: true,
        isPrivate: true,
        videoLengthSeconds: true,
      },
    });

    if (!videoDbData) {
      return notFound();
    }

    videoData = {
      title: videoDbData.title,
      largeThumbnailKey: videoDbData.largeThumbnailKey,
      isPrivate: videoDbData.isPrivate,
      videoLengthSeconds: videoDbData.videoLengthSeconds,
      source: {
        key: videoDbData.sources[0].key,
        width: videoDbData.sources[0].width,
        height: videoDbData.sources[0].height,
        type: videoDbData.sources[0].type,
      },
    };

    await redis.hset(`videoMetadata:${videoId}`, videoData);
    await redis.expire(`videoMetadata:${videoId}`, 60 * 60 * 24 * 7);
  }

  let url: string | undefined;

  if (!videoData.isPrivate) {
    url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: env.VIDEOS_BUCKET_NAME, Key: videoData.source.key }),
      { expiresIn: 60 * 60 * 24 * 7 },
    );
  }

  return {
    title: videoData.title,
    largeThumbnailKey: videoData.largeThumbnailKey,
    isPrivate: videoData.isPrivate,
    videoLengthSeconds: videoData.videoLengthSeconds,
    source: {
      ...videoData.source,
      url,
    },
  };
}

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

export async function createVideoToken(
  videoId: string,
  videoDuration: number,
  userId?: string | null,
) {
  const ip = await getIp();

  const tokenIdentifier = ip ?? userId ?? videoId;

  const utcTimestamp = Math.round(dayjs.utc().valueOf() / 1000);

  const signSync = createSigner({
    key: process.env.TOKEN_SIGNING_SECRET,
    clockTimestamp: utcTimestamp,
  });

  const token = signSync({
    videoId,
    identifier: tokenIdentifier,
    videoDuration,
    iat: utcTimestamp,
  });

  return token;
}

async function generateVideoSources(
  videoData: Awaited<ReturnType<typeof getVideoDataFromDb>>["videoData"],
) {
  const sources = await Promise.all(
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

  return sources;
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
      storyboardJson: true,
      nativeFileKey: true,
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
      nativeFileKey: videoData.nativeFileKey,
    },
    storyboard: videoData.storyboardJson
      ? {
          ...videoData.storyboardJson,
          url: `${env.THUMBNAIL_BASE_URL}/${videoData.nativeFileKey}-storyboard.jpg`,
        }
      : null,
    largeThumbnailUrl,
    videoCreatedAt,
  };
}

export async function getVideoAuthorData(authorId: string) {
  const clerk = await clerkClient();

  const authorData = await clerk.users.getUser(authorId);

  return {
    username: authorData.username,
    profileImageUrl: authorData.imageUrl,
    accountTier: (authorData.publicMetadata.accountTier ?? "free") as string,
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
