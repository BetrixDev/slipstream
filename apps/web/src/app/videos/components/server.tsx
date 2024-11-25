import { fetchVideosData } from "../data";
import { StorageUsedText } from "./storage-used-text";
import { UploadButton } from "./upload-button";
import { UploadingVideosContainer } from "./uploading-videos-container";
import { VideosBoard } from "./videos-board";

export async function Server() {
  const data = await fetchVideosData();

  return (
    <main className="grow container space-y-8 mx-auto px-4 py-8">
      <div className="flex gap-2 items-center justify-between">
        <h1 className="text-2xl w-64 font-bold">Your Videos</h1>
        <div className="flex flex-col-reverse md:flex-row items-center md:gap-8">
          <StorageUsedText
            maxStorage={data.userMaxStorage}
            totalStorageUsed={data.totalStorageUsed}
          />
          <UploadButton />
        </div>
      </div>
      <div className="container flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <UploadingVideosContainer />
          <VideosBoard serverVideos={data.serverVideos} />
        </div>
      </div>
    </main>
  );
}
