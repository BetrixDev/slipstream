import { env } from "@/env";
import type { Metadata } from "next";
import { getVideoMetaData } from "./data";
import { Suspense } from "react";
import { Server } from "./components/server";
import { LoadingSkeleton } from "./components/loading-skeleton";
import { notFound } from "next/navigation";
import Script from "next/script";

export const experimental_ppr = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ videoId: string }>;
}): Promise<Metadata> {
  const videoId = (await params).videoId;

  const start = performance.now();

  const videoData = await getVideoMetaData(videoId);

  console.log({
    event: "getVideoMetaData",
    durationMs: performance.now() - start,
  });

  const largeThumbnailUrl = `${env.THUMBNAIL_BASE_URL}/${videoData.largeThumbnailKey}`;

  if (videoData.isPrivate) {
    return notFound();
  }

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
      videos: [
        {
          url: videoData.source.url!,
          height: videoData.source.height ?? 1920,
          width: videoData.source.width ?? 1080,
          type: videoData.source.type,
        },
      ],
    },
    other: {
      ["og:type"]: "video",
      ...(videoData.source.height && {
        ["og:video:height"]: videoData.source.height.toString(),
      }),
      ...(videoData.source.width && {
        ["og:video:width"]: videoData.source.width.toString(),
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
      <Script
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3191192737129047"
        crossOrigin="anonymous"
      />
      <div className="max-w-screen h-screen flex flex-col">
        <Suspense fallback={<LoadingSkeleton />}>
          <Server params={params} />
        </Suspense>
      </div>
    </>
  );
}
