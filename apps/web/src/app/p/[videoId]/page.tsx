import { Button } from "@/components/ui/button";
import { env } from "@/env";
import { auth } from "@clerk/nextjs/server";
import { EyeIcon, Loader2, SquareArrowOutUpRightIcon, VideoIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MediaPlayer, MediaProvider, Poster } from "@vidstack/react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { DefaultVideoLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import { WordyDate } from "./components/wordy-date";
import type { Metadata } from "next";
import { createVideoToken, getIp, getVideoData } from "./data";
import { createSigner } from "fast-jwt";
import { ViewIncrementer } from "./components/view-incrementer";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

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
    return {
      title: "Video not found | Flowble",
      description: "This video could not be found on Flowble",
      openGraph: {
        title: "Video not found",
        description: "This video could not be found on Flowble",
        siteName: "Flowble",
        locale: "en-US",
      },
      twitter: {
        card: "summary",
        title: "Video not found",
        description: "This video could not be found on Flowble",
      },
      icons: {
        icon: "/favicon.ico",
      },
    };
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
  const videoId = (await params).videoId;

  const { videoData, videoSources, largeThumbnailUrl, videoCreatedAt } =
    await getVideoData(videoId);

  const { userId } = await auth();

  const isViewerAuthor = userId === videoData.authorId;

  if (videoData.isPrivate && !isViewerAuthor) {
    return notFound();
  }

  const token = await createVideoToken(videoId, videoData.videoLengthSeconds ?? 0, userId);

  return (
    <>
      {videoData.videoLengthSeconds !== null && (
        <ViewIncrementer token={token} videoDuration={videoData.videoLengthSeconds} />
      )}
      <div className="max-w-screen h-screen flex flex-col">
        <header className="max-h-16 h-16 flex justify-between items-center px-4">
          <Link className="flex items-center" href="/" prefetch>
            <button className="flex-shrink-0 flex items-center z-10">
              <VideoIcon className="h-8 w-8 text-blue-500" />
              <span className="ml-2 text-2xl font-bold">Flowble</span>
            </button>
          </Link>
          <Link className="flex items-center" href={isViewerAuthor ? "/videos" : "/"} prefetch>
            <Button variant="outline" className="text-md flex gap-2 items-center rounded-lg h-10">
              <SquareArrowOutUpRightIcon className="w-5 h-5" />
              {isViewerAuthor ? "Back to your videos" : "Go to Flowble"}
            </Button>
          </Link>
        </header>
        <div className="flex gap-4 p-4 max-w-full overflow-x-hidden h-full flex-col xl:flex-row">
          <MediaPlayer
            className="w-full aspect-video rounded-lg overflow-hidden"
            src={videoSources as any}
            viewType="video"
            streamType="on-demand"
            playsInline
            title={videoData.title}
            poster={largeThumbnailUrl ?? undefined}
            duration={videoData.videoLengthSeconds ?? undefined}
            storage="player"
          >
            <MediaProvider>
              {largeThumbnailUrl !== null && (
                <Poster className="vds-poster" src={largeThumbnailUrl} />
              )}
            </MediaProvider>
            <DefaultVideoLayout icons={defaultLayoutIcons} />
          </MediaPlayer>
          <div className="flex flex-col gap-4 min-w-96 w-96 grow">
            <Card className="border-none shadow-none">
              <CardContent className="p-0 space-y-4">
                <h1 className="text-2xl font-bold">{videoData.title}</h1>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Uploaded on <WordyDate timestamp={videoCreatedAt} />
                  </span>
                  <span className="flex items-center gap-1">
                    <EyeIcon className="w-4 h-4" />
                    {videoData.views.toLocaleString()} views
                  </span>
                </div>
                {videoData.isProcessing && (
                  <span className="text-sm text-muted flex gap-2">
                    <Loader2 className="animate-spin" /> This video is still processing. Playback
                    may less smooth than usual
                  </span>
                )}
              </CardContent>
            </Card>
            <Separator />
            <Card className="grow min-h-64 border-none shadow-none"></Card>
          </div>
        </div>
      </div>
    </>
  );
}
