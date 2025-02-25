import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RangeSlider } from "@/components/ui/range-slider";
import { formatSecondsToTimestamp } from "@/lib/utils";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { useAtom, useSetAtom } from "jotai";
import { Loader2Icon, PauseIcon, PlayIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  customFileToUploadAtom,
  isUploadDialogOpenAtom,
  trimVideoDataAtom,
} from "@/lib/atoms";

export function TrimVideoDialog() {
  const [trimVideoData] = useAtom(trimVideoDataAtom);
  const [queryClient] = useState(new QueryClient());

  if (!trimVideoData) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TrimVideoDialogChild />
    </QueryClientProvider>
  );
}

function TrimVideoDialogChild() {
  const [trimVideoData, setTrimVideoData] = useAtom(trimVideoDataAtom);
  const setCustomFileToUploadAtom = useSetAtom(customFileToUploadAtom);
  const setIsUploadDialogOpenAtom = useSetAtom(isUploadDialogOpenAtom);

  const ffmpegRef = useRef(new FFmpeg());
  const viewportRef = useRef<HTMLVideoElement>(null);
  const lastRangeValue = useRef<[number, number] | null>(null);

  const [isViewportPlaying, setIsViewportPlaying] = useState(false);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number>();

  const videoUrl = useMemo(
    () => URL.createObjectURL(trimVideoData!.file),
    [trimVideoData]
  );

  const { isLoading } = useQuery({
    queryKey: ["loadFfmpeg"],
    refetchOnMount: true,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const ffmpeg = ffmpegRef.current;

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });

      return true;
    },
  });

  const {
    mutate: handleRenderVideo,
    isPending: isRendering,
    isError: isRenderError,
  } = useMutation({
    mutationFn: async () => {
      if (!lastRangeValue.current || !trimVideoData) {
        return false;
      }

      resetViewportToBeginning();

      const ffmpeg = ffmpegRef.current;

      await ffmpeg.writeFile("input.mp4", await fetchFile(trimVideoData.file));

      const startTimestamp = formatSecondsToTimestamp(
        lastRangeValue.current[0]
      );
      const endTimestamp = formatSecondsToTimestamp(lastRangeValue.current[1]);

      await ffmpeg.exec([
        "-i",
        "input.mp4",
        "-ss",
        startTimestamp,
        "-to",
        endTimestamp,
        "-c",
        "copy",
        "output_video.mp4",
      ]);

      const data = await ffmpeg.readFile("output_video.mp4");

      const file = new File([new Blob([data])], trimVideoData.file.name, {
        type: trimVideoData?.file.type,
      });

      console.log(file.type);

      setTrimVideoData({ title: trimVideoData?.title ?? null, file });
    },
    onError: (err) => {
      console.error(err);
    },
  });

  useEffect(() => {
    const controller = new AbortController();

    const media = new Audio();

    media.src = videoUrl;

    media.addEventListener(
      "loadedmetadata",
      () => {
        const durationInSeconds = media.duration;

        setVideoDurationSeconds(durationInSeconds);
      },
      {
        signal: controller.signal,
      }
    );

    return () => {
      controller.abort();
    };
  }, [videoUrl]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: look into
  useEffect(() => {
    if (!viewportRef.current || !lastRangeValue.current) {
      return;
    }

    const playbackDuration =
      (lastRangeValue.current[1] - lastRangeValue.current[0]) * 1000;

    const timeout = setTimeout(() => {
      if (!viewportRef.current || !lastRangeValue.current) {
        return;
      }

      resetViewportToBeginning();

      setIsViewportPlaying(false);
    }, playbackDuration);

    return () => {
      clearTimeout(timeout);
    };
  }, [isViewportPlaying]);

  function handleBackToUploadClick() {
    setTrimVideoData(undefined);
    setCustomFileToUploadAtom(trimVideoData?.file);
    setIsUploadDialogOpenAtom(true);
  }

  function handleRangeValueChange(value: [number, number]) {
    let currentTime = value[0];

    if (lastRangeValue.current) {
      if (lastRangeValue.current[1] !== value[1]) {
        currentTime = value[1];
      }
    }

    lastRangeValue.current = value;

    if (isViewportPlaying) {
      setIsViewportPlaying(false);
      resetViewportToBeginning();
    } else if (viewportRef.current) {
      viewportRef.current.currentTime = currentTime;
    }
  }

  function resetViewportToBeginning() {
    if (!viewportRef.current || !lastRangeValue.current) {
      return;
    }

    viewportRef.current.pause();
    viewportRef.current.currentTime = lastRangeValue.current[0];
  }

  function handleViewportClick() {
    if (!viewportRef.current || !lastRangeValue.current) {
      return;
    }

    viewportRef.current.currentTime = lastRangeValue.current[0];
    viewportRef.current.volume = 0.25;

    if (isViewportPlaying) {
      viewportRef.current.pause();
      setIsViewportPlaying(false);
    } else {
      viewportRef.current.play();
      setIsViewportPlaying(true);
    }
  }

  return (
    <Dialog
      onOpenChange={(o) => {
        if (!o) {
          if (viewportRef.current) {
            viewportRef.current.src = "";
          }

          setTrimVideoData(undefined);
        }
      }}
      open={trimVideoData !== undefined}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trim Video</DialogTitle>
        </DialogHeader>
        {isLoading && (
          <div className="flex flex-col gap-2 items-center">
            <Loader2Icon className="animate-spin" />
            Downloading required libraries. Please wait
          </div>
        )}
        {videoDurationSeconds !== undefined && !isLoading && (
          <>
            <div className="relative">
              <div
                className="absolute z-[99999] flex items-center justify-center h-full w-full hover:cursor-pointer"
                onClick={() => {
                  handleViewportClick();
                }}
              >
                {isViewportPlaying ? (
                  <PauseIcon className="w-10 h-10 opacity-80 " />
                ) : (
                  <PlayIcon className="w-10 h-10 opacity-80 " />
                )}
              </div>
              {/* biome-ignore lint/a11y/useMediaCaption: can't do it here */}
              <video ref={viewportRef} src={videoUrl} />
            </div>
            <div className="flex justify-between">
              <span>{formatSecondsToTimestamp(0)}</span>
              <span>{formatSecondsToTimestamp(videoDurationSeconds)}</span>
            </div>
            <RangeSlider
              defaultValue={[0, 100]}
              min={0}
              max={videoDurationSeconds}
              step={0.1}
              onValueChange={handleRangeValueChange}
            />
            <Button
              className="bg-red-500 text-white flex gap-4"
              onClick={() => handleRenderVideo()}
              disabled={isRendering}
            >
              {isRendering && <Loader2Icon className="animate-spin" />}
              Render Video
            </Button>
            <Button
              disabled={isRenderError || isRendering}
              onClick={() => handleBackToUploadClick()}
            >
              Back to upload
            </Button>
            {isRenderError && (
              <p className="text-destructive text-small">
                An error occured when trying to render your video. Please try
                again later
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
