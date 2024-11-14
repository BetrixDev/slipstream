import TopNav from "@/components/top-nav";
import { UploadButton } from "./components/upload-button";
import { DeleteVideoDialog } from "./components/dialogs/delete-video-dialog";
import { UploadVideoDialog } from "./components/dialogs/upload-video-dialog";
import { UploadingVideosContainer } from "./components/uploading-videos-container";
import { StorageUsedTextServer } from "./components/storage-used-text/storage-used-text-server";
import { VideosBoardServer } from "./components/videos-board/videos-board-server";
import { Suspense } from "react";
import TopNavFallback from "@/components/top-nav-fallback";
import { VideosBoardFallback } from "./components/videos-board/videos-board-fallback";
import { EditVideoDialog } from "./components/dialogs/edit-video-dialog";
import { TrimVideoDialog } from "./components/dialogs/trim-video-dialog";
import { FullPageDropzone } from "./components/full-page-dropzone";

export const experimental_ppr = true;

export default async function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <EditVideoDialog />
      <DeleteVideoDialog />
      <UploadVideoDialog />
      <TrimVideoDialog />
      <FullPageDropzone />
      <Suspense fallback={<TopNavFallback />}>
        <TopNav />
      </Suspense>
      <main className="grow container space-y-8 mx-auto px-4 py-8">
        <div className="flex gap-2 items-center justify-between">
          <h1 className="text-2xl w-64 font-bold">Your Videos</h1>
          <div className="flex flex-col-reverse md:flex-row items-center md:gap-8">
            <Suspense>
              <StorageUsedTextServer />
            </Suspense>
            <UploadButton />
          </div>
        </div>
        <div className="container flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <UploadingVideosContainer />
            <Suspense fallback={<VideosBoardFallback />}>
              <VideosBoardServer />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
