import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { Eye, Copy, Loader2, HardDriveDownload, Trash, EyeOff, ListTodo } from "lucide-react";
import { deleteVideoAtom, editVideoAtom } from "~/atoms";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { handleCopyLink, humanFileSize, formatSecondsToTimestamp } from "~/lib/utils";
import { Link } from "@remix-run/react";
import axios from "axios";
import { useEffect } from "react";
import { toast } from "sonner";

export type VideoBoardProps = {
  videos: {
    id: string;
    title: string;
    views: number;
    fileSizeBytes: number;
    smallThumbnailUrl?: string;
    videoLengthSeconds?: number;
    isProcessing: boolean;
    isPrivate: boolean;
    createdAt: number;
  }[];
};

export function VideosBoard({ videos }: VideoBoardProps) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["videos"],
    initialData: videos,
  });

  useEffect(() => {
    queryClient.setQueryData(["videos"], videos);
  }, [videos]);

  return data.map((video) => {
    return <UploadedVideo key={video.id} {...(video as any)} />;
  });
}

type UploadedVideoProps = {
  id: string;
  title: string;
  views: number;
  fileSizeBytes: number;
  smallThumbnailUrl: string;
  videoLengthSeconds?: number;
  isPrivate: boolean;
};

function UploadedVideo(video: UploadedVideoProps) {
  const setDeleteVideo = useSetAtom(deleteVideoAtom);
  const setEditVideo = useSetAtom(editVideoAtom);

  const { mutate: onDownloadClick } = useMutation({
    mutationFn: async () => {
      const { data } = await axios<{ url: string | null }>(`/api/downloadVideo/${video.id}`);

      if (!data.url) {
        throw new Error("Download URL is not available");
      }

      window.open(data.url);
    },
    onError: (error) => {
      console.log(error);
      toast.error("Unable to download video at this time", { description: video.title });
    },
  });

  return (
    <Card
      key={video.id}
      className="dark relative bg-card rounded-lg overflow-hidden shadow-md transition-shadow duration-300 ease-in-out hover:shadow-lg group aspect-video border-border/50 hover:border-border flex flex-col justify-between"
    >
      <div className="absolute inset-0">
        {video.smallThumbnailUrl ? (
          <img
            src={video.smallThumbnailUrl}
            alt={`${video.title} thumbnail`}
            className="transition-transform duration-200 ease-in-out group-hover:scale-105 w-full"
          />
        ) : (
          <ThumbnailPlaceholder id={video.id} />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-60 transition-opacity duration-300 ease-in-out group-hover:bg-opacity-40"></div>
      </div>
      <div className="absolute right-0 text-xs flex gap-1 m-1">
        {video.videoLengthSeconds !== undefined && (
          <span className="p-1 bg-black/50 rounded-md backdrop-blur-md">
            {formatSecondsToTimestamp(video.videoLengthSeconds ?? 0)}s
          </span>
        )}
        <span className="p-1 bg-black/50 rounded-md backdrop-blur-md">
          {humanFileSize(video.fileSizeBytes)}
        </span>
      </div>
      <div className="absolute right-0 top-7 text-xs flex gap-1 m-1">
        <span className="p-1 bg-black/50 rounded-md backdrop-blur-md">
          {video.isPrivate ? (
            <span className="flex gap-1 items-center">
              <EyeOff className="w-4 h-4" />
              Private
            </span>
          ) : (
            <span className="flex gap-1 items-center">
              <Eye className="w-4 h-4" /> Unlisted
            </span>
          )}
        </span>
      </div>
      <div className="relative z-10 p-4 h-full flex flex-col justify-end">
        <Link to={`/p/${video.id}`}>
          <Button
            variant="link"
            className="text-lg font-semibold line-clamp-2 text-white transition-colors duration-300 ease-in-out p-0"
          >
            {video.title}
          </Button>
        </Link>
        <div className="flex gap-1">
          <div className="flex items-center text-sm font-medium text-white gap-1">
            <Eye className="w-4 h-4" />
            {video.views.toLocaleString()} views
          </div>
          <Button
            variant="link"
            className="text-white flex items-center gap-1"
            onMouseDown={() => handleCopyLink(video.id, video.title)}
          >
            <Copy className="w-4 h-4" /> Copy Link
          </Button>
        </div>
      </div>
      <div className="z-10 bg-black/15 backdrop-blur-md border-t-[1px] flex">
        <Button
          variant="ghost"
          className="rounded-none grow flex items-center gap-2 justify-center hover:bg-black/50"
          onClick={() => onDownloadClick()}
        >
          <HardDriveDownload className="h-4 w-4" /> Download
        </Button>
        <Button
          variant="ghost"
          className="rounded-none grow hover:bg-black/50 flex items-center gap-2 justify-center"
          onMouseDown={() => {
            setEditVideo({
              id: video.id,
              name: video.title,
            });
          }}
        >
          <ListTodo className="h-4 w-4" /> Edit
        </Button>
        <Button
          variant="ghost"
          className="rounded-none grow flex items-center gap-2 justify-center hover:bg-black/50"
          onMouseDown={() => {
            setDeleteVideo({
              id: video.id,
              name: video.title,
              contentLength: video.fileSizeBytes,
            });
          }}
        >
          <Trash className="w-4 h-4" />
          Delete
        </Button>
      </div>
    </Card>
  );
}

type ThumbnailPlaceholderProps = {
  id: string;
};

function ThumbnailPlaceholder(props: ThumbnailPlaceholderProps) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["processingVideo", props.id],
    retry: 3,
    queryFn: async () => {
      const { data } = await axios<{ smallThumbnailUrl: string | null }>(
        `/api/checkVideoProcessingStatus/${props.id}`,
      );

      if (data.smallThumbnailUrl) {
        const videos: VideoBoardProps["videos"] = queryClient.getQueryData(["videos"]) ?? [];

        const newVideos = videos.map((v) => {
          if (v.id === props.id) {
            return {
              ...v,
              smallThumbnailUrl: data.smallThumbnailUrl,
            };
          } else {
            return v;
          }
        });

        console.log(newVideos);

        queryClient.setQueryData(["videos"], newVideos);
      }

      return data.smallThumbnailUrl;
    },
    refetchInterval: 1000 * 3,
  });

  return (
    <div className="transition-transform duration-200 ease-in-out group-hover:scale-105 w-full h-2/3 flex flex-col gap-2 items-center justify-center">
      <Loader2 className="w-12 h-12 aspect-square animate-spin text-muted" />
    </div>
  );
}
