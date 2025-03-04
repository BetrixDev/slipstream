import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@clerk/tanstack-start";
import { Link, createFileRoute } from "@tanstack/react-router";
import { MediaPlayer, MediaProvider, Poster } from "@vidstack/react";
import {
  PlyrLayout,
  plyrLayoutIcons,
} from "@vidstack/react/player/layouts/plyr";
import playerBaseCss from "@vidstack/react/player/styles/base.css?url";
import playerThemeCss from "@vidstack/react/player/styles/plyr/theme.css?url";
import plyrCss from "../plyr.css?url";
import {
  EyeIcon,
  Loader2Icon,
  SquareArrowOutUpRightIcon,
  VideoIcon,
} from "lucide-react";
import { AuthorInfo } from "../components/author-info";
import { ViewIncrementer } from "../components/view-incrementer";
import { WordyDate } from "../components/wordy-date";
import { seo } from "@/lib/seo";
import { Footer } from "@/components/footer";
import { queryClient } from "./__root";
import { type VideoData, videoQueryOptions } from "@/lib/query-utils";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/p/$videoId")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const cachedVideoData = queryClient.getQueryData(
      videoQueryOptions(params.videoId).queryKey
    );

    if (cachedVideoData) {
      return cachedVideoData;
    }

    const videoData = await queryClient.fetchQuery(
      videoQueryOptions(params.videoId)
    );

    return videoData;
  },
  pendingMs: 0,
  head: ({ loaderData }) => {
    const sourceData = loaderData.playbackData?.videoSources?.at(0);

    return {
      links: [
        { rel: "stylesheet", href: playerBaseCss },
        { rel: "stylesheet", href: playerThemeCss },
        { rel: "stylesheet", href: plyrCss },
      ],
      meta: seo({
        title: loaderData.videoData.title,
        description: `Watch ${loaderData.videoData.title} on Slipstream`,
        image: loaderData.playbackData?.largeThumbnailUrl ?? undefined,
        video: {
          url: sourceData?.src,
          type: sourceData?.type,
          width: sourceData?.width,
          height: sourceData?.height,
        },
      }),
    };
  },
});

function RouteComponent() {
  const { videoId } = Route.useParams();
  const initialVideoData = Route.useLoaderData();

  const { user } = useUser();

  const { data: videoData } = useQuery({
    ...videoQueryOptions(videoId),
    placeholderData: initialVideoData,
  });

  const isViewerAuthor = user?.id === videoData?.videoData.authorId;

  return (
    <div className="max-w-screen h-screen flex flex-col">
      <>
        {videoData?.videoData.videoLengthSeconds && (
          <ViewIncrementer
            videoId={videoId}
            videoDuration={videoData.videoData.videoLengthSeconds}
          />
        )}
        <header className="max-h-16 h-16 flex justify-between items-center px-4 p-2">
          <Link className="flex items-center" to="/" preload="render">
            <button
              className="flex-shrink-0 flex items-center z-10"
              type="button"
            >
              <VideoIcon className="h-8 w-8 text-red-500" />
              <span className="ml-2 text-2xl font-bold">Slipstream</span>
            </button>
          </Link>
          <Link
            className="flex items-center"
            to={isViewerAuthor ? "/videos" : "/"}
            preload="intent"
          >
            <Button
              variant="outline"
              className="text-md flex gap-2 items-center rounded-lg h-10"
            >
              <SquareArrowOutUpRightIcon className="w-5 h-5" />
              <span className="hidden md:block">
                {isViewerAuthor ? "Back to your videos" : "Go to Slipstream"}
              </span>
            </Button>
          </Link>
        </header>
        <div className="flex gap-4 p-4 max-w-full overflow-x-hidden h-full flex-col xl:flex-row">
          <div className="w-full">
            {videoData && <VideoPlayer video={videoData} />}
          </div>
          <div className="flex flex-col gap-4 min-w-96 w-96 grow">
            <Card className="border-none shadow-none bg-transparent">
              <CardContent className="p-0 space-y-4">
                <h1 className="text-2xl font-bold">
                  {videoData?.videoData.title}
                </h1>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between text-sm text-muted-foreground">
                  {videoData?.videoData.videoCreatedAt && (
                    <span>
                      Uploaded on{" "}
                      <WordyDate
                        timestamp={videoData?.videoData.videoCreatedAt}
                      />
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <EyeIcon className="w-4 h-4" />
                    {videoData?.videoData.views.toLocaleString()} views
                  </span>
                </div>
                {videoData?.videoData.isProcessing && (
                  <span className="text-sm text-muted flex gap-2">
                    <Loader2Icon className="animate-spin" /> This video is still
                    processing. Playback may less smooth than usual
                  </span>
                )}
                {videoData?.videoData.authorId && (
                  <AuthorInfo authorId={videoData?.videoData.authorId} />
                )}
              </CardContent>
            </Card>
            <Card className="grow min-h-64 border-none shadow-none bg-transparent" />
          </div>
        </div>
      </>
      <Footer />
    </div>
  );
}

type VideoPlayerProps = {
  video: VideoData;
};

function VideoPlayer({ video }: VideoPlayerProps) {
  if (!video.playbackData) {
    return null;
  }

  return (
    <MediaPlayer
      title={video.videoData.title}
      // biome-ignore lint/suspicious/noExplicitAny: types are fine
      src={video.playbackData.videoSources as any}
      poster={video.playbackData.largeThumbnailUrl ?? undefined}
    >
      <MediaProvider />
      <PlyrLayout
        thumbnails={video.playbackData.storyboard}
        icons={plyrLayoutIcons}
      />
    </MediaPlayer>
  );
}
