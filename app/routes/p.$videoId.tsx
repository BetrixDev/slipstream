import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { queryClient } from "./__root";
import { videoQueryOptions } from "../lib/query-utils";
import { useQuery } from "@tanstack/react-query";
import { ViewIncrementer } from "../components/view-incrementer";
import {
  EyeIcon,
  Loader2Icon,
  SquareArrowOutUpRightIcon,
  VideoIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/tanstack-start";
import { MediaPlayer, MediaProvider, Poster } from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import { Card, CardContent } from "@/components/ui/card";
import { WordyDate } from "../components/wordy-date";
import { AuthorInfo } from "../components/author-info";
import { Separator } from "@radix-ui/react-dropdown-menu";

import themeCss from "@vidstack/react/player/styles/default/theme.css?url";
import audioCss from "@vidstack/react/player/styles/default/layouts/audio.css?url";
import videoCss from "@vidstack/react/player/styles/default/layouts/video.css?url";

export const Route = createFileRoute("/p/$videoId")({
  component: RouteComponent,
  loader: ({ params }) => {
    if (!params.videoId) {
      throw redirect({ to: "/" });
    }

    queryClient.prefetchQuery(videoQueryOptions(params.videoId));
  },
  head: () => ({
    links: [
      { rel: "stylesheet", href: themeCss },
      { rel: "stylesheet", href: audioCss },
      { rel: "stylesheet", href: videoCss },
    ],
  }),
});

function RouteComponent() {
  const { videoId } = Route.useParams();

  const { data } = useQuery(videoQueryOptions(videoId));

  const { user } = useUser();

  if (!data) {
    return null;
  }

  const { videoData, videoSources } = data;

  const isViewerAuthor = user?.id === videoData.authorId;

  return (
    <div className="max-w-screen h-screen flex flex-col">
      <>
        {videoData.videoLengthSeconds !== null && (
          <ViewIncrementer
            videoId={videoId}
            videoDuration={videoData.videoLengthSeconds}
          />
        )}
        <header className="max-h-16 h-16 flex justify-between items-center px-4">
          <Link className="flex items-center" to="/" preload="render">
            <button
              className="flex-shrink-0 flex items-center z-10"
              type="button"
            >
              <VideoIcon className="h-8 w-8 text-blue-500" />
              <span className="ml-2 text-2xl font-bold">Flowble</span>
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
              {isViewerAuthor ? "Back to your videos" : "Go to Flowble"}
            </Button>
          </Link>
        </header>
        <div className="flex gap-4 p-4 max-w-full overflow-x-hidden h-full flex-col xl:flex-row">
          <MediaPlayer
            className="w-full aspect-video rounded-lg overflow-hidden"
            // biome-ignore lint/suspicious/noExplicitAny: types are fine
            src={videoSources as any}
            viewType="video"
            streamType="on-demand"
            playsInline
            title={videoData.title}
            poster={data.largeThumbnailUrl ?? undefined}
            duration={videoData.videoLengthSeconds ?? undefined}
            storage="player"
          >
            <MediaProvider>
              {data.largeThumbnailUrl !== null && (
                <Poster className="vds-poster" src={data.largeThumbnailUrl} />
              )}
            </MediaProvider>
            <DefaultVideoLayout
              icons={defaultLayoutIcons}
              thumbnails={data.storyboard}
            />
          </MediaPlayer>
          <div className="flex flex-col gap-4 min-w-96 w-96 grow">
            <Card className="border-none shadow-none">
              <CardContent className="p-0 space-y-4">
                <h1 className="text-2xl font-bold">{videoData.title}</h1>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Uploaded on <WordyDate timestamp={data.videoCreatedAt} />
                  </span>
                  <span className="flex items-center gap-1">
                    <EyeIcon className="w-4 h-4" />
                    {videoData.views.toLocaleString()} views
                  </span>
                </div>
                {videoData.isProcessing && (
                  <span className="text-sm text-muted flex gap-2">
                    <Loader2Icon className="animate-spin" /> This video is still
                    processing. Playback may less smooth than usual
                  </span>
                )}
                <AuthorInfo authorId={videoData.authorId} />
              </CardContent>
            </Card>
            <Separator />
            <Card className="grow min-h-64 border-none shadow-none" />
          </div>
        </div>
      </>
    </div>
  );
}
