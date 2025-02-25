import { Button } from "@/components/ui/button";
import { videosQueryOptions } from "@/lib/query-utils";
import { formatSecondsToTimestamp, humanFileSize } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  TriggerAuthContext,
  useRealtimeRunsWithTag,
} from "@trigger.dev/react-hooks";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import {
  ClockIcon,
  CopyIcon,
  EyeIcon,
  FileVideoIcon,
  Loader2Icon,
  LockIcon,
  PencilIcon,
  PlayIcon,
  Trash2Icon,
  UnlockIcon,
} from "lucide-react";
import { type ComponentProps, memo, useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

dayjs.extend(utc);
dayjs.extend(relativeTime);

type VideoCardProps = {
  title: string;
  views: number;
  createdAt: string;
  videoLengthSeconds: number;
  fileSizeBytes: number;
  isPrivate: boolean;
  videoId: string;
  thumbnailUrl?: string | null;
  triggerAccessToken?: string;
  status: "uploading" | "processing" | "ready" | "deleting";
  pendingDeletionDate?: string | null;
  onDownloadClick: () => void;
  onCopyClick: () => void;
  onEditClick: () => void;
  onDeleteClick: () => void;
};

export const VideoCard = memo(VideoCardComponent, (prev, next) => {
  return (
    prev.videoId === next.videoId &&
    prev.title === next.title &&
    prev.views === next.views &&
    prev.createdAt === next.createdAt &&
    prev.videoLengthSeconds === next.videoLengthSeconds &&
    prev.fileSizeBytes === next.fileSizeBytes &&
    prev.isPrivate === next.isPrivate &&
    prev.thumbnailUrl === next.thumbnailUrl &&
    prev.triggerAccessToken === next.triggerAccessToken &&
    prev.status === next.status &&
    prev.pendingDeletionDate === next.pendingDeletionDate
  );
});

function VideoCardComponent(props: VideoCardProps) {
  return (
    <div className="relative group/video aspect-video max-w-2xl rounded-lg overflow-hidden border">
      <VideoThumbnail
        smallThumbnailUrl={props.thumbnailUrl}
        title={props.title}
        videoId={props.videoId}
        triggerAccessToken={props.triggerAccessToken}
      />

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 from-20% via-black/20 via-50% to-transparent transition-opacity duration-200 group-hover/video:opacity-50" />

      {/* Play button */}
      <Link to={"/p/$videoId"} params={{ videoId: props.videoId }}>
        <button
          type="button"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-full flex items-center justify-center text-white transition-all"
        >
          <PlayIcon className="w-8 h-8 ml-1" fill="currentColor" />
        </button>
      </Link>

      {/* Top right info */}
      <div className="absolute top-3 right-3 flex items-center gap-3 text-white/90">
        {!!props.pendingDeletionDate && (
          <PendingDeletionChip deletionDate={props.pendingDeletionDate} />
        )}
        <div className="flex items-center gap-1.5 text-sm bg-black/50 px-2 py-1 rounded-md backdrop-blur-md">
          <FileVideoIcon className="w-3.5 h-3.5" />
          {humanFileSize(props.fileSizeBytes)}
        </div>
        <div className="flex items-center gap-1.5 text-sm bg-black/50 px-2 py-1 rounded-md backdrop-blur-md">
          <ClockIcon className="w-3.5 h-3.5" />
          {formatSecondsToTimestamp(props.videoLengthSeconds)}
        </div>
        <div className="flex items-center gap-1.5 text-sm bg-black/50 px-2 py-1 rounded-md backdrop-blur-md">
          {props.isPrivate ? (
            <LockIcon className="w-3.5 h-3.5" />
          ) : (
            <UnlockIcon className="w-3.5 h-3.5" />
          )}
          {props.isPrivate ? "Private" : "Unlisted"}
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white/90">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Link to={"/p/$videoId"} params={{ videoId: props.videoId }}>
              <Button variant="link" className="text-lg font-medium p-0">
                {props.title}
              </Button>
            </Link>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <div className="flex items-center gap-1">
                <EyeIcon className="w-3.5 h-3.5" />
                {props.views.toLocaleString()} views
              </div>
              <span>
                <RelativeDate timestamp={props.createdAt} />
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => props.onCopyClick()}
              variant="ghost"
              size="icon"
              className="text-white/90 hover:text-white"
            >
              <CopyIcon className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => props.onEditClick()}
              variant="ghost"
              size="icon"
              className="text-white/90 hover:text-white"
            >
              <PencilIcon className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => props.onDeleteClick()}
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
            >
              <Trash2Icon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type VideoThumbnailProps = {
  smallThumbnailUrl?: string | null;
  title: string;
  videoId: string;
  triggerAccessToken?: string;
};

function VideoThumbnail({
  smallThumbnailUrl,
  title,
  triggerAccessToken,
  videoId,
}: VideoThumbnailProps) {
  if (smallThumbnailUrl) {
    return (
      <img
        src={smallThumbnailUrl}
        alt={`Thumbnail for ${title}`}
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
        draggable="false"
      />
    );
  }

  if (triggerAccessToken) {
    return (
      <TriggerAuthContext.Provider value={{ accessToken: triggerAccessToken }}>
        <ThumbnailPlaceholder videoId={videoId} />
      </TriggerAuthContext.Provider>
    );
  }

  return null;
}

type ThumbnailPlaceholderProps = {
  videoId: string;
};

function ThumbnailPlaceholder(props: ThumbnailPlaceholderProps) {
  const queryClient = useQueryClient();
  const { runs } = useRealtimeRunsWithTag(`videoProcessing_${props.videoId}`);

  useEffect(() => {
    for (const run of runs) {
      if (
        run.metadata &&
        run.metadata.videoId === props.videoId &&
        run.metadata.smallThumbnailUrl
      ) {
        queryClient.setQueryData(videosQueryOptions.queryKey, (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            videos: oldData.videos.map((v) => {
              if (v.id === props.videoId && run.metadata) {
                return {
                  ...v,
                  smallThumbnailUrl: run.metadata.smallThumbnailUrl as string,
                };
              }
              return v;
            }),
          };
        });
      }
    }
  }, [runs, props.videoId, queryClient]);

  return (
    <div className="transition-transform duration-200 ease-in-out group-hover/video:scale-105 w-full h-2/3 flex flex-col gap-2 items-center justify-center">
      <Loader2Icon className="w-12 h-12 aspect-square animate-spin text-muted" />
    </div>
  );
}

function PendingDeletionChip({ deletionDate }: { deletionDate: string }) {
  const daysAway = dayjs(deletionDate).utc().local().diff(dayjs(), "days");

  if (daysAway > 7) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="z-[99999999]">
          <span className="text-sm p-1 bg-destructive rounded-md rounded-tr-sm backdrop-blur-md">
            Pending Deletion
          </span>
        </TooltipTrigger>
        <TooltipContent>
          This video will be deleted in {daysAway} day(s).{" "}
          <Link to="/pricing" preload="intent">
            <span className="text-red-600 underline">Upgrade your account</span>
          </Link>{" "}
          to keep it forever.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type RelativeDateProps = {
  timestamp: number | string;
} & ComponentProps<"span">;

export function RelativeDate({ timestamp, ...props }: RelativeDateProps) {
  const [dateString, setDateString] = useState("");

  function getUpdatedDateString() {
    const dayjsInstance = dayjs.utc(timestamp).local();

    if (dayjs().diff(dayjsInstance, "day") < 7) {
      return dayjsInstance.fromNow();
    }

    return new Date(dayjsInstance.valueOf()).toLocaleString(undefined, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: not needed
  useEffect(() => {
    setDateString(getUpdatedDateString());

    const interval = setInterval(() => {
      setDateString(getUpdatedDateString());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return <span {...props}>{dateString}</span>;
}
