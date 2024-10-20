import { useAtom, useSetAtom } from "jotai";
import { customFileToUploadAtom, isUploadDialogOpenAtom, trimVideoDataAtom } from "~/atoms";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { RangeSlider } from "./ui/range-slider";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { formatSecondsToTimestamp } from "~/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Loader, Loader2 } from "lucide-react";

export function TrimVideoDialogContainer() {
  const [trimVideoData] = useAtom(trimVideoDataAtom);

  if (!trimVideoData) {
    return null;
  }

  return <TrimVideoDialog />;
}

function TrimVideoDialog() {
  const ffmpegRef = useRef(new FFmpeg());
  const lastRangeValue = useRef<[number, number] | null>(null);
  const viewportRef = useRef<HTMLVideoElement>(null);
  const [trimVideoData, setTrimVideoData] = useAtom(trimVideoDataAtom);
  const setCustomFileToUploadAtom = useSetAtom(customFileToUploadAtom);
  const setIsUploadDialogOpenAtom = useSetAtom(isUploadDialogOpenAtom);

  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number>();

  const videoUrl = useMemo(() => URL.createObjectURL(trimVideoData!.file), [trimVideoData!.file]);

  const { isLoading } = useQuery({
    queryKey: ["loadFfmpeg"],
    queryFn: async () => {
      const ffmpeg = ffmpegRef.current;

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      return true;
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
      },
    );

    return () => {
      controller.abort();
    };
  }, [videoUrl]);

  const {
    mutate: handleRenderVideo,
    isPending: isRendering,
    isError: isRenderError,
  } = useMutation({
    mutationFn: async () => {
      if (!lastRangeValue.current) {
        return false;
      }
      const ffmpeg = ffmpegRef.current;

      await ffmpeg.writeFile("input.mp4", await fetchFile(trimVideoData!.file));

      const startTimestamp = formatSecondsToTimestamp(lastRangeValue.current[0]);
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
        "output.mp4",
      ]);

      const data = await ffmpeg.readFile("output.mp4");

      const blob = new Blob([data]);
      const file = new File([blob], trimVideoData!.file.name);

      setTrimVideoData({ title: trimVideoData?.title, file });
    },
    onError: (err) => {
      console.error(err);
    },
  });

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

    if (viewportRef.current) {
      viewportRef.current.currentTime = currentTime;
    }
  }

  return (
    <Dialog
      onOpenChange={(o) => {
        if (!o) {
          if (viewportRef.current) {
            viewportRef.current.src = undefined as any;
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
          <div>
            <Loader className="animate-spin" />
            Downloading required libraries
          </div>
        )}
        {videoDurationSeconds !== undefined && !isLoading && (
          <>
            <video ref={viewportRef} src={videoUrl} controls />
            <div className="flex justify-between">
              <span>{formatSecondsToTimestamp(0)}</span>
              <span>{formatSecondsToTimestamp(parseFloat(videoDurationSeconds.toFixed(2)))}</span>
            </div>
            <RangeSlider
              defaultValue={[0, 100]}
              min={0}
              max={videoDurationSeconds}
              step={0.1}
              onValueChange={handleRangeValueChange}
            />
            <Button
              className="bg-blue-500 text-white flex gap-4"
              onClick={() => handleRenderVideo()}
              disabled={isRendering}
            >
              {isRendering && <Loader2 className="animate-spin" />}
              Render Video
            </Button>
            <Button
              disabled={isRenderError && isRendering}
              onClick={() => handleBackToUploadClick()}
            >
              Back to upload
            </Button>
            {isRenderError && (
              <p className="text-destructive text-small">
                An error occured when trying to render your video. Please try again later
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
