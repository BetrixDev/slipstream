import { env } from "@/env";
import type { Metadata } from "next";
import { getVideoData } from "./data";
import { Suspense } from "react";
import { Server } from "./components/server";
import { LoadingSkeleton } from "./components/loading-skeleton";
import { notFound } from "next/navigation";

export const experimental_ppr = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ videoId: string }>;
}): Promise<Metadata> {
  const videoId = (await params).videoId;

  const { videoData, videoSources } = await getVideoData(videoId);

  const largeThumbnailUrl = `${env.THUMBNAIL_BASE_URL}/${videoData.largeThumbnailKey}`;

  if (videoData.isPrivate) {
    return notFound();
  }

  const nativeVideoSource = videoData.sources.find((source) => source.isNative)!;

  return {
    title: `${videoData.title} | Flowble`,
    description: `Watch ${videoData.title} on Flowble`,
    twitter: {
      title: videoData.title,
      description: `Watch ${videoData.title} on Flowble`,
      card: "summary_large_image",
      images: [largeThumbnailUrl],
    },
    icons: {
      icon: "/favicon.ico",
    },
    openGraph: {
      title: videoData.title,
      url: `https://flowble.app/p/${videoId}`,
      siteName: "Flowble",
      description: `Watch ${videoData.title} on Flowble`,
      images: [largeThumbnailUrl],
      locale: "en-US",
      videos: videoSources
        .filter((source) => source.isNative)
        .map((source) => ({
          url: source.src,
          secureUrl: source.src,
          width: source.width,
          height: source.height,
          type: source.type,
        })),
    },
    other: {
      ["og:type"]: "video",
      ...(nativeVideoSource.height && {
        ["og:video:height"]: nativeVideoSource.height.toString(),
      }),
      ...(nativeVideoSource.width && {
        ["og:video:width"]: nativeVideoSource.width.toString(),
      }),
      ...(videoData.videoLengthSeconds && {
        ["og:video:duration"]: videoData.videoLengthSeconds.toString(),
      }),
    },
  };
}

export default async function Page({ params }: { params: Promise<{ videoId: string }> }) {
  return (
    <>
      <div className="max-w-screen h-screen flex flex-col">
        <Suspense fallback={<LoadingSkeleton />}>
          <Server params={params} />
        </Suspense>
      </div>
    </>
  );
}
