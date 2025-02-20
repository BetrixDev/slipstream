import TopNav from "@/components/top-nav";
import { createFileRoute } from "@tanstack/react-router";
import { usageDataQueryOptions, videosQueryOptions } from "../lib/query-utils";
import { DeleteVideoDialog } from "../videos/components/dialogs/delete-video-dialog";
import { EditVideoDialog } from "../videos/components/dialogs/edit-video-dialog";
import { TrimVideoDialog } from "../videos/components/dialogs/trim-video-dialog";
import { UploadVideoDialog } from "../videos/components/dialogs/upload-video-dialog";
import { FullPageDropzone } from "../videos/components/full-page-dropzone";
import { Server } from "../videos/components/server";
import { queryClient } from "./__root";
import { StorageUsedText } from "../videos/components/storage-used-text";
import { UploadButton } from "../videos/components/upload-button";
import { UploadingVideosContainer } from "../videos/components/uploading-videos-container";
import { VideosBoard } from "../videos/components/videos-board";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/videos")({
  component: RouteComponent,
  loader: () => {
    queryClient.ensureQueryData(videosQueryOptions);
    queryClient.ensureQueryData(usageDataQueryOptions);
  },
});

function RouteComponent() {
  const { data: videoData, isLoading } = useQuery(videosQueryOptions);
  const { data: usageData } = useQuery(usageDataQueryOptions);

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      {/* Fix this dialog stuff */}
      {/* <EditVideoDialog /> */}
      <DeleteVideoDialog />
      <UploadVideoDialog />
      <TrimVideoDialog />
      <FullPageDropzone />
      <main className="grow container space-y-8 mx-auto px-4 py-8">
        <div className="flex gap-2 items-center justify-between">
          <h1 className="text-2xl w-64 font-bold">Your Videos</h1>
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
        <div className="container flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <UploadingVideosContainer />
            {videoData && <VideosBoard videos={videoData.videos} />}
          </div>
        </div>
      </main>
    </div>
  );
}
