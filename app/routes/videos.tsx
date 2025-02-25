import TopNav from "../components/top-nav";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { usageDataQueryOptions, videosQueryOptions } from "../lib/query-utils";
import { DeleteVideoDialog } from "../components/dialogs/delete-video-dialog";
import { EditVideoDialog } from "../components/dialogs/edit-video-dialog";
import { TrimVideoDialog } from "../components/dialogs/trim-video-dialog";
import { UploadVideoDialog } from "../components/dialogs/upload-video-dialog";
import { FullPageDropzone } from "../components/full-page-dropzone";
import { queryClient } from "./__root";
import { StorageUsedText } from "../components/storage-used-text";
import { UploadButton } from "../components/upload-button";
import { UploadingVideosContainer } from "../components/uploading-videos-container";
import { VideosBoard } from "../components/videos-board";
import { useQuery } from "@tanstack/react-query";
import { fetchClerkAuth } from "@/server-fns/clerk";
import { seo } from "@/lib/seo";
import { HeroHighlight } from "@/components/ui/hero-highlight";
import { Separator } from "@/components/ui/seperator";

export const Route = createFileRoute("/videos")({
  component: RouteComponent,
  beforeLoad: async () => {
    const { userId } = await fetchClerkAuth();

    if (!userId) {
      throw redirect({ to: "/sign-in/$" });
    }

    return {
      userId,
    };
  },
  loader: () => {
    queryClient.prefetchQuery(videosQueryOptions);
    queryClient.prefetchQuery(usageDataQueryOptions);
  },
  head: () => ({
    meta: [...seo({ title: "Your Videos" })],
  }),
});

function RouteComponent() {
  const { data: videoData } = useQuery(videosQueryOptions);
  const { data: usageData } = useQuery(usageDataQueryOptions);

  return (
    <HeroHighlight className="min-h-screen flex flex-col">
      <TopNav />
      <EditVideoDialog />
      <DeleteVideoDialog />
      <UploadVideoDialog />
      <TrimVideoDialog />
      <FullPageDropzone />
      <main className="grow container space-y-8 mx-auto px-4 py-8">
        <div className="flex gap-2 items-center justify-between">
          <h1 className="text-2xl w-64 font-bold">Your Catalog</h1>
          <div className="flex flex-col-reverse md:flex-row items-center md:gap-8">
            {usageData && (
              <StorageUsedText
                maxStorage={usageData.maxStorage}
                totalStorageUsed={usageData.totalStorageUsed}
              />
            )}
            <UploadButton />
          </div>
        </div>
        <Separator />
        <div className="container flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <UploadingVideosContainer />
            {videoData && <VideosBoard videos={videoData.videos} />}
          </div>
        </div>
      </main>
    </HeroHighlight>
  );
}
