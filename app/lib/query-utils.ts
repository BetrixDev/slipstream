import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/start";
import { z } from "zod";
import { authGuardMiddleware } from "../middleware/auth-guard";
import { db } from "./db";
import { desc } from "drizzle-orm";
import { videos } from "./schema";
import { MAX_FILE_SIZE_FREE_TIER, PLAN_STORAGE_SIZES } from "./constants";
import { clerkClient, getAuth } from "@clerk/tanstack-start/server";
import { getIpFromHeaders, safeParseAccountTier } from "./utils";
import { getWebRequest } from "@tanstack/start/server";
import dayjs from "dayjs";
import { createSigner } from "fast-jwt";
import { env } from "./env";
import { getVideoDataServerFn } from "@/server-fns/video-player";

export const queryKeys = {
  videos: ["videos"],
  video: (videoId: string) => ["video", videoId],
  usageData: ["usageData"],
  authorData: (authorId: string) => ["authorData", authorId],
  viewToken: (videoId: string) => ["viewToken", videoId],
};

const fetchVideos = createServerFn({ method: "GET" })
  .middleware([authGuardMiddleware])
  .handler(async ({ context }) => {
    const videoData = await db.query.videos.findMany({
      where: (table, { eq, and }) =>
        and(
          eq(table.authorId, context.userId),
          eq(table.isQueuedForDeletion, false)
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
  queryFn: () => fetchVideos(),
  staleTime: 1000 * 60 * 5,
});

const fetchVideo = createServerFn({ method: "POST" })
  .validator(z.object({ videoId: z.string() }))
  .handler(async ({ data }) => {
    const videoData = await getVideoDataServerFn({
      data: { videoId: data.videoId },
    });
    return videoData;
  });

export const videoQueryOptions = (videoId: string) =>
  queryOptions({
    queryKey: queryKeys.video(videoId),
    queryFn: () => fetchVideo({ data: { videoId: videoId } }),
    staleTime: 1000 * 60 * 5,
  });

const fetchUsageDataServerFn = createServerFn({ method: "GET" })
  .middleware([authGuardMiddleware])
  .handler(async ({ context }) => {
    const userData = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.id, context.userId),
      columns: {
        totalStorageUsed: true,
        accountTier: true,
      },
    });

    const maxStorage = PLAN_STORAGE_SIZES[userData?.accountTier ?? "free"];

    return {
      totalStorageUsed: userData?.totalStorageUsed ?? 0,
      maxStorage,
      maxFileUpload:
        userData?.accountTier === "free" ? MAX_FILE_SIZE_FREE_TIER : undefined,
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
    staleTime: 1000 * 60 * 60 * 5,
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
