import "server-only";

import { auth } from "@clerk/nextjs/server";
import { db, desc, videos } from "db";
import { redirect } from "next/navigation";
import { PLAN_STORAGE_SIZES, MAX_FILE_SIZE_FREE_TIER } from "cms";
import { env } from "process";

export async function fetchVideosData() {
  const { userId } = await auth();

  if (!userId) {
    const origin =
      process.env.NODE_ENV === "production" ? "https://www.flowble.app" : "http://localhost:3000";

    return redirect(`/sign-in?redirect_url=${encodeURIComponent(`${origin}/videos`)}`);
  }

  const userData = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
    columns: {
      accountTier: true,
      totalStorageUsed: true,
    },
    with: {
      videos: {
        orderBy: desc(videos.createdAt),
        columns: {
          fileSizeBytes: true,
          views: true,
          title: true,
          id: true,
          isPrivate: true,
          videoLengthSeconds: true,
          isProcessing: true,
          createdAt: true,
          smallThumbnailKey: true,
          deletionDate: true,
        },
      },
    },
  });

  if (!userData) {
    return redirect("/");
  }

  const serverVideos = userData.videos.map((video) => ({
    ...video,
    createdAt: video.createdAt.toString(),
    deletionDate: video.deletionDate?.toString() ?? null,
    smallThumbnailUrl: `${env.THUMBNAIL_BASE_URL}/${video.smallThumbnailKey}`,
  }));

  const userMaxStorage = PLAN_STORAGE_SIZES[userData.accountTier];
  const maxFileUpload = userData.accountTier === "free" ? MAX_FILE_SIZE_FREE_TIER : undefined;

  return {
    serverVideos,
    userMaxStorage,
    maxFileUpload,
    totalStorageUsed: userData.totalStorageUsed,
  };
}
