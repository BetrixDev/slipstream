import { useDialogsStore } from "@/lib/stores/dialogs";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import { toast } from "sonner";
import { handleCopyLink } from "../lib/utils";
import { getVideoDownloadDetailsServerFn } from "../server-fns/videos";
import { VideoCard } from "./video-card";

dayjs.extend(utc);
dayjs.extend(relativeTime);

type Video = {
  id: string;
  title: string;
  views: number;
  fileSizeBytes: number;
  smallThumbnailUrl?: string | null;
  triggerAccessToken?: string;
  videoLengthSeconds?: number | null;
  status: "uploading" | "processing" | "ready" | "deleting";
  isPrivate: boolean;
  createdAt: string;
  pendingDeletionDate?: string | null;
};

export function VideosBoard({ videos }: { videos: Video[] }) {
  const openDeleteVideoDialog = useDialogsStore((state) => state.openDeleteVideoDialog);
  const openEditVideoDialog = useDialogsStore((state) => state.openEditVideoDialog);

  async function onDownloadClick(videoId: string, videoTitle: string) {
    try {
      const { url } = await getVideoDownloadDetailsServerFn({
        data: { videoId },
      });

      if (url === null) {
        throw new Error("URL is null");
      }

      setTimeout(() => {
        window.open(url);
      });
    } catch {
      toast.error("Unable to download video at this time", {
        description: videoTitle,
      });
    }
  }

  return videos.map((video) => (
    <VideoCard
      thumbnailUrl={video.smallThumbnailUrl}
      triggerAccessToken={video.triggerAccessToken}
      key={video.id}
      videoId={video.id}
      title={video.title}
      views={video.views}
      createdAt={video.createdAt}
      videoLengthSeconds={video.videoLengthSeconds ?? 0}
      fileSizeBytes={video.fileSizeBytes}
      isPrivate={video.isPrivate}
      status={video.status}
      pendingDeletionDate={video.pendingDeletionDate}
      onDownloadClick={() => onDownloadClick(video.id, video.title)}
      onCopyClick={() => handleCopyLink(video.id, video.title)}
      onEditClick={() => {
        openEditVideoDialog(video.id, video.title);
      }}
      onDeleteClick={() => {
        openDeleteVideoDialog(video.id, video.title, video.fileSizeBytes);
      }}
    />
  ));
}
