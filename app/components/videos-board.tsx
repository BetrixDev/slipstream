import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatSecondsToTimestamp,
  handleCopyLink,
  humanFileSize,
} from "../lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import {
  TriggerAuthContext,
  useRealtimeRunsWithTag,
} from "@trigger.dev/react-hooks";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import { useSetAtom } from "jotai";
import {
  Copy,
  Eye,
  EyeOff,
  HardDriveDownload,
  ListTodo,
  Loader2Icon,
  Trash,
} from "lucide-react";
import { type ComponentProps, useEffect, useState } from "react";
import { toast } from "sonner";
import { getVideoDownloadDetailsServerFn } from "../server-fns/videos";
import { deleteVideoAtom, editVideoAtom } from "../lib/atoms";
import {
  type Video,
  useUserVideoDatastore,
} from "@/lib/stores/user-video-data";
import { Link } from "@tanstack/react-router";

dayjs.extend(utc);
dayjs.extend(relativeTime);

export function VideosBoard({ videos }: { videos: Video[] }) {
  return videos.map((video) => <UploadedVideo video={video} key={video.id} />);
}

function UploadedVideo({ video }: { video: Video }) {
  const setDeleteVideo = useSetAtom(deleteVideoAtom);
  const setEditVideo = useSetAtom(editVideoAtom);

  async function onDownloadClick() {
    try {
      const { url } = await getVideoDownloadDetailsServerFn({
        data: { videoId: video.id },
      });

      if (url === null) {
        throw new Error("URL is null");
      }

      window.open(url);
    } catch {
      toast.error("Unable to download video at this time", {
        description: video.title,
      });
    }
  }

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
          <div>Fix this thumbnail placeholder stuff</div>
          // <TriggerAuthContext.Provider
          //   value={{ accessToken: video.triggerAccessToken }}
          // >
          //   <ThumbnailPlaceholder videoId={video.id} />
          // </TriggerAuthContext.Provider>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-60 transition-opacity duration-300 ease-in-out group-hover:bg-opacity-40" />
      </div>
      <div className="absolute right-0 text-xs flex gap-1 m-1">
        {!!video.deletionDate && (
          <PendingDeletionChip deletionDate={video.deletionDate} />
        )}
        {!Number.isNaN(Number.parseFloat(`${video.videoLengthSeconds}`)) && (
          <span className="p-1 bg-black/50 rounded-md backdrop-blur-md">
            {formatSecondsToTimestamp(video.videoLengthSeconds ?? 0)}s
          </span>
        )}
        <span className="p-1 bg-black/50 rounded-md rounded-tr-sm backdrop-blur-md">
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
        <Link
          to={"/p/$videoId"}
          params={{ videoId: video.id }}
          preload="intent"
        >
          <Button
            variant="link"
            className="text-lg font-semibold line-clamp-2 text-white transition-colors duration-300 ease-in-out p-0"
          >
            {video.title}
          </Button>
        </Link>
        <div className="flex justify-between">
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
          <RelativeDate
            timestamp={video.createdAt}
            className="text-sm font-medium text-white flex items-center"
          />
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
  videoId: string;
};

function ThumbnailPlaceholder(props: ThumbnailPlaceholderProps) {
  const { runs } = useRealtimeRunsWithTag(`video-processing-${props.videoId}`);

  useEffect(() => {
    for (const run of runs) {
      if (
        run.metadata &&
        run.metadata.videoId === props.videoId &&
        run.metadata.smallThumbnailUrl
      ) {
        useUserVideoDatastore.setState((state) => ({
          videos: state.videos.map((v) => {
            if (v.id === props.videoId && run.metadata) {
              return {
                ...v,
                smallThumbnailUrl: run.metadata.smallThumbnailUrl as string,
              };
            }

            return v;
          }),
        }));
      }
    }
  }, [runs, props.videoId]);

  return (
    <div className="transition-transform duration-200 ease-in-out group-hover:scale-105 w-full h-2/3 flex flex-col gap-2 items-center justify-center">
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
          <span className="p-1 bg-destructive/50 rounded-md rounded-tr-sm backdrop-blur-md">
            Pending Deletion
          </span>
        </TooltipTrigger>
        <TooltipContent>
          This video will be deleted in {daysAway} day(s).{" "}
          <Link to="/pricing" preload="intent">
            <span className="text-blue-600 underline">
              Upgrade your account
            </span>
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
