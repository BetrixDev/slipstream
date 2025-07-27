import { usageDataQueryOptions } from "@/lib/query-utils";
import { useUploadingVideosStore } from "@/lib/stores/uploading-videos";
import { queryClient } from "@/routes/__root";
import { onUploadCancelledServerFn } from "@/server-fns/videos";
import { toast } from "sonner";
import { VideoCard } from "./video-card";

export function UploadingVideosContainer() {
  const { uploadingVideos, removeVideo } = useUploadingVideosStore();

  function handleUploadCancel(videoId: string, videoTitle: string, videoSizeBytes: number) {
    removeVideo(videoId);
    queryClient.setQueryData(usageDataQueryOptions.queryKey, (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        totalStorageUsed: Math.max(oldData.totalStorageUsed - videoSizeBytes, 0),
      };
    });

    toast.promise(onUploadCancelledServerFn({ data: { videoId } }), {
      loading: "Cancelling upload...",
      success: "Upload cancelled",
      error: "Failed to cancel upload",
      description: videoTitle,
    });
  }

  return (
    <>
      {uploadingVideos.map((video) => (
        <VideoCard
          key={video.id}
          title={video.title}
          views={0}
          createdAt={new Date().toISOString()}
          fileSizeBytes={video.file.size}
          isPrivate={false}
          videoId={video.id}
          status="uploading"
          uploadProgress={video.uploadProgress}
          onCancelUploadClick={() => handleUploadCancel(video.id, video.title, video.file.size)}
          onDeleteClick={() => handleUploadCancel(video.id, video.title, video.file.size)}
        />
      ))}
    </>
  );
}
