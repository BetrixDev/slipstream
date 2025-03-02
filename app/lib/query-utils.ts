import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/start";
import { z } from "zod";
import { authGuardMiddleware } from "../middleware/auth-guard";
import { db } from "./db";
import { and, desc, eq, inArray, not, sum } from "drizzle-orm";
import { videos, type VideoStoryboard } from "./schema";
import {
  MAX_FILE_SIZE_FREE_TIER,
  MAX_FILE_SIZE_PAID_TIER,
  PLAN_STORAGE_SIZES,
} from "./constants";
import { clerkClient, getAuth } from "@clerk/tanstack-start/server";
import {
  getIpFromHeaders,
  notNanOrDefault,
  safeParseAccountTier,
} from "./utils";
import { getWebRequest } from "@tanstack/start/server";
import dayjs from "dayjs";
import { createSigner } from "fast-jwt";
import { env } from "./env";
import { generateVideoSources } from "@/server-fns/video-player";
import { notFound } from "@tanstack/react-router";
import { Redis } from "@upstash/redis";

export const queryKeys = {
  videos: ["videos"],
  video: (videoId: string) => ["video", videoId],
  videoPlayback: (videoId: string) => ["videoPlayback", videoId],
  usageData: ["usageData"],
  authorData: (authorId: string) => ["authorData", authorId],
  viewToken: (videoId: string) => ["viewToken", videoId],
};

const fetchVideosData = createServerFn({ method: "GET" })
  .middleware([authGuardMiddleware])
  .handler(async ({ context }) => {
    const videoData = await db.query.videos.findMany({
      where: (table, { eq, and }) =>
        and(
          eq(table.authorId, context.userId),
          eq(table.isQueuedForDeletion, false),
          not(inArray(table.status, ["deleting", "uploading"]))
        ),
      orderBy: desc(videos.createdAt),
      columns: {
        fileSizeBytes: true,
        views: true,
        title: true,
        id: true,
        isPrivate: true,
        videoLengthSeconds: true,
        status: true,
        createdAt: true,
        smallThumbnailKey: true,
        pendingDeletionDate: true,
      },
    });

    const mappedVideos = (videoData ?? []).map((video) => {
      const data = {
        ...video,
        createdAt: video.createdAt.toISOString(),
        pendingDeletionDate: video.pendingDeletionDate?.toISOString(),
        smallThumbnailUrl: video.smallThumbnailKey
          ? `${env.THUMBNAIL_BASE_URL}/${video.smallThumbnailKey}`
          : undefined,
      };

      // @ts-expect-error
      delete data.smallThumbnailKey;

      return data;
    });

    return { videos: mappedVideos };
  });

export const videosQueryOptions = queryOptions({
  queryKey: queryKeys.videos,
  queryFn: () => fetchVideosData(),
  staleTime: ({ state }) => {
    if (
      state?.data &&
      "signedIn" in state.data &&
      state.data?.signedIn === false
    ) {
      return 0;
    }

    return 1000 * 60 * 5;
  },
});

export type VideoData = {
  videoData: {
    title: string;
    isPrivate: boolean;
    videoLengthSeconds?: number | null;
    views: number;
    authorId: string;
    isProcessing: boolean;
    videoCreatedAt: string;
  };
  playbackData?: {
    smallThumbnailUrl?: string | null;
    largeThumbnailUrl?: string | null;
    videoSources: {
      src: string;
      type?: string;
      height?: number;
      width?: number;
    }[];
    storyboard?: VideoStoryboard & { url: string };
  };
};

const fetchVideoData = createServerFn({ method: "POST" })
  .validator(z.object({ videoId: z.string() }))
  .handler(async ({ data }) => {
    const redis = new Redis({
      url: env.REDIS_REST_URL,
      token: env.REDIS_REST_TOKEN,
    });

    try {
      const cachedVideoData = await redis.get<VideoData>(
        `video:${data.videoId}`
      );

      if (cachedVideoData) {
        return cachedVideoData;
      }
    } catch (error) {
      console.log(error);
    }

    const videoData = await db.query.videos.findFirst({
      where: (table, { eq }) => eq(table.id, data.videoId),
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

    if (
      !videoData ||
      videoData.status === "deleting" ||
      videoData.status === "uploading"
    ) {
      throw notFound();
    }

    if (videoData.isPrivate) {
      const { userId } = await getAuth(getWebRequest()!);

      if (userId !== videoData.authorId) {
        throw notFound();
      }
    }

    const largeThumbnailUrl =
      videoData.largeThumbnailKey &&
      `${env.THUMBNAIL_BASE_URL}/${videoData.largeThumbnailKey}`;

    const smallThumbnailUrl =
      videoData.smallThumbnailKey &&
      `${env.THUMBNAIL_BASE_URL}/${videoData.smallThumbnailKey}`;

    const storyboardUrl =
      videoData.storyboardJson &&
      `${env.THUMBNAIL_BASE_URL}/${videoData.id}-storyboard.jpg`;

    const fullVideoData = {
      videoData: {
        ...videoData,
        videoCreatedAt: videoData.createdAt.toISOString(),
        isProcessing: videoData.status === "processing",
      },
      playbackData: {
        videoSources: await generateVideoSources(videoData.sources),
        largeThumbnailUrl,
        smallThumbnailUrl,
        storyboard: videoData.storyboardJson
          ? {
              ...videoData.storyboardJson,
              url: storyboardUrl,
            }
          : undefined,
      },
    } as VideoData;

    if (videoData.status === "ready" && !videoData.isPrivate) {
      try {
        await redis.set(`video:${data.videoId}`, fullVideoData, {
          ex: 60 * 60 * 24, // 1 day
        });
      } catch (error) {
        console.log(error);
      }
    }

    return fullVideoData;
  });

export const videoQueryOptions = (videoId: string) =>
  queryOptions({
    queryKey: queryKeys.video(videoId),
    queryFn: () => fetchVideoData({ data: { videoId: videoId } }),
    staleTime: ({ state }) => {
      if (
        state.data?.playbackData === undefined ||
        state.data?.videoData.isProcessing
      ) {
        return 0;
      }

      return Number.POSITIVE_INFINITY;
    },
  });

const fetchUsageDataServerFn = createServerFn({ method: "GET" })
  .middleware([authGuardMiddleware])
  .handler(async ({ context }) => {
    const [userData, [{ totalVideoStorageUsed }]] = await db.batch([
      db.query.users.findFirst({
        where: (table, { eq }) => eq(table.id, context.userId),
        columns: {
          accountTier: true,
        },
      }),
      db
        .select({
          totalVideoStorageUsed: sum(videos.fileSizeBytes),
        })
        .from(videos)
        .where(
          and(
            eq(videos.authorId, context.userId),
            inArray(videos.status, ["ready", "processing"])
          )
        ),
    ]);

    const maxStorage = PLAN_STORAGE_SIZES[userData?.accountTier ?? "free"];

    return {
      totalStorageUsed: notNanOrDefault(totalVideoStorageUsed),
      maxStorage,
      maxFileUpload:
        userData?.accountTier === "free"
          ? MAX_FILE_SIZE_FREE_TIER
          : MAX_FILE_SIZE_PAID_TIER,
    };
  });

export const usageDataQueryOptions = queryOptions({
  queryKey: queryKeys.usageData,
  queryFn: () => fetchUsageDataServerFn(),
  staleTime: 1000 * 60 * 60 * 24,
});

const fetchAuthorDataServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ authorId: z.string() }))
  .handler(async ({ data }) => {
    const clerk = clerkClient({});

    const authorData = await clerk.users.getUser(data.authorId);

    return {
      username: authorData.username,
      profileImageUrl: authorData.imageUrl,
      accountTier: safeParseAccountTier(authorData.publicMetadata.accountTier),
    };
  });

export const authorDataQueryOptions = (authorId: string) =>
  queryOptions({
    queryKey: queryKeys.authorData(authorId),
    queryFn: () => fetchAuthorDataServerFn({ data: { authorId } }),
    staleTime: 1000 * 60 * 60 * 24,
  });

const fetchViewTokenServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      videoId: z.string(),
      videoDuration: z.number(),
      userId: z.string().nullable().optional(),
    })
  )
  .handler(async ({ data }) => {
    const webRequest = getWebRequest();

    if (!webRequest) {
      return { token: null };
    }

    const { userId } = await getAuth(webRequest);

    const ip = getIpFromHeaders(webRequest.headers);

    const tokenIdentifier = userId ?? ip ?? data.videoId;

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

export const viewTokenQueryOptions = (videoId: string, videoDuration: number) =>
  queryOptions({
    queryKey: queryKeys.viewToken(videoId),
    queryFn: () => fetchViewTokenServerFn({ data: { videoId, videoDuration } }),
    staleTime: 0,
  });
