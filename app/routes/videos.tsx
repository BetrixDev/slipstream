import { Footer } from "@/components/footer";
import { HumanFileSizeMotion } from "@/components/human-file-size-motion";
import { HeroHighlight } from "@/components/ui/hero-highlight";
import { Separator } from "@/components/ui/seperator";
import { VideoCardSkeleton } from "@/components/video-card";
import { seo } from "@/lib/seo";
import { humanFileSize } from "@/lib/utils";
import { useUser } from "@clerk/tanstack-start";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { DeleteVideoDialog } from "../components/dialogs/delete-video-dialog";
import { EditVideoDialog } from "../components/dialogs/edit-video-dialog";
import { UploadVideoDialog } from "../components/dialogs/upload-video-dialog";
import { FullPageDropzone } from "../components/full-page-dropzone";
import TopNav from "../components/top-nav";
import { UploadButton } from "../components/upload-button";
import { UploadingVideosContainer } from "../components/uploading-videos-container";
import { VideosBoard } from "../components/videos-board";
import { usageDataQueryOptions, videoQueryOptions, videosQueryOptions } from "../lib/query-utils";
import { queryClient } from "./__root";

export const Route = createFileRoute("/videos")({
  component: RouteComponent,
  pendingMs: 0,
  head: () => ({
    meta: seo({
      title: "Your Videos",
      description: "View your video catablog on Slipstream Video",
      keywords: "videos, upload, upload video, upload videos",
    }),
  }),
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const { user } = useUser();
  const { data: videoData, isLoading } = useQuery({
    ...videosQueryOptions,
    queryFn: async () => {
      try {
        // @ts-expect-error
        const data = await videosQueryOptions.queryFn!();

        return data;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "isRedirect" in error &&
          error.isRedirect &&
          "to" in error &&
          typeof error.to === "string"
        ) {
          // @ts-expect-error
          navigate(error);

          return {
            videos: [],
            signedIn: false,
          };
        }

        return {
          videos: [],
        };
      }
    },
  });
  const { data: usageData } = useQuery(usageDataQueryOptions);

  useEffect(() => {
    if (!videoData || !user?.id) {
      return;
    }

    videoData.videos.forEach((video) => {
      queryClient.setQueryData(videoQueryOptions(video.id).queryKey, {
        videoData: {
          title: video.title,
          isPrivate: video.isPrivate,
          videoLengthSeconds: video.videoLengthSeconds,
          views: video.views,
          authorId: user.id,
          isProcessing: video.status === "processing",
          videoCreatedAt: video.createdAt.toString(),
        },
      });
    });
  }, [videoData, user]);

  return (
    <HeroHighlight className="min-h-screen flex flex-col">
      <TopNav />
      <EditVideoDialog />
      <DeleteVideoDialog />
      <UploadVideoDialog />
      <FullPageDropzone />
      <main className="grow container space-y-8 mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Videos</h1>

          <div className="flex flex-col gap-4 md:gap-2 md:flex-row md:items-center">
            <div className="text-sm md:order-1 md:p-2">
              {usageData && (
                <div className="bg-background/50 h-12 p-2 rounded-lg flex items-center justify-center border backdrop-blur-sm">
                  Storage used:
                  <span className="mx-1">
                    <HumanFileSizeMotion size={usageData.totalStorageUsed} />
                  </span>{" "}
                  / {humanFileSize(usageData.maxStorage)}
                </div>
              )}
            </div>
            <UploadButton />
          </div>
        </div>
        <Separator />
        <div className="container flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <UploadingVideosContainer />
            {isLoading ? (
              <>
                <VideoCardSkeleton />
                <VideoCardSkeleton />
                <VideoCardSkeleton />
              </>
            ) : (
              videoData && <VideosBoard videos={videoData.videos} />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </HeroHighlight>
  );
}
