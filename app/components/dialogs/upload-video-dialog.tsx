import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type FieldApi, useForm } from "@tanstack/react-form";
import {
  AlertCircleIcon,
  FileVideoIcon,
  Loader2Icon,
  PauseIcon,
  PlayIcon,
  Scissors,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUploadingVideosStore } from "@/lib/stores/uploading-videos";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usageDataQueryOptions } from "@/lib/query-utils";
import { useDialogsStore } from "@/lib/stores/dialogs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  cn,
  formatSecondsToTimestamp,
  humanFileSize,
  notNanOrDefault,
} from "@/lib/utils";
import { Progress } from "../ui/progress";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { RangeSlider } from "../ui/range-slider";

type FormData = {
  title: string | null;
  file: File | null;
};

// @ts-expect-error
// biome-ignore lint/suspicious/noExplicitAny: we don't care about the type here
export function FieldInfo({ field }: { field: FieldApi<any, any, any, any> }) {
  return (
    <span className="text-sm text-destructive">
      {field.state.meta.isTouched && field.state.meta.errors.length ? (
        <span>{field.state.meta.errors.join(", ")}</span>
      ) : null}
      {field.state.meta.isValidating ? "Validating..." : null}
    </span>
  );
}

export function UploadVideoDialog() {
  const isUploadVideoDialogOpen = useDialogsStore(
    (state) => state.isUploadVideoDialogOpen
  );

  if (!isUploadVideoDialogOpen) {
    return null;
  }

  return <UploadVideoDialogChild />;
}

function UploadVideoDialogChild() {
  const { data: usageData } = useQuery(usageDataQueryOptions);

  const userMaxFileUploadSize = notNanOrDefault(usageData?.maxFileUpload, 0);
  const userTotalStorageUsed = notNanOrDefault(usageData?.totalStorageUsed, 0);
  const userTotalStorageAvailable = notNanOrDefault(usageData?.maxStorage, 0);

  const [isDragging, setIsDragging] = useState(false);
  const [isTrimDialogOpen, setIsTrimDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addVideo = useUploadingVideosStore((s) => s.addVideo);

  const closeUploadVideoDialog = useDialogsStore(
    (s) => s.closeUploadVideoDialog
  );
  const isUploadVideoDialogOpen = useDialogsStore(
    (s) => s.isUploadVideoDialogOpen
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // @ts-expect-error expects all 10 type generics in this version? https://tanstack.com/form/latest/docs/framework/react/reference/functions/useform#type-parameters
  const form = useForm<FormData>({
    defaultValues: {
      file: null,
      title: null,
    },
    onSubmit: ({ value }) => {
      if (!value.file || !value.title) {
        return;
      }

      addVideo({
        file: value.file,
        title: value.title,
      });

      closeUploadVideoDialog();
    },
  });

  function handleFileChange(file: File | null) {
    form.setFieldValue("file", file);
    form.validateField("file", "change");

    if (file?.name && form.state.values.title === null) {
      form.setFieldValue(
        "title",
        file.name.split(".").slice(0, -1).join(".").slice(0, 100)
      );
    }
  }

  return (
    <>
      {form.state.values.file && isTrimDialogOpen && (
        <TrimVideoDialog
          isOpen={isTrimDialogOpen}
          onOpenChange={setIsTrimDialogOpen}
          videoFile={form.state.values.file}
          setNewVideoFile={(file) => {
            form.setFieldValue("file", file);
          }}
        />
      )}
      <Dialog
        open={isUploadVideoDialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            closeUploadVideoDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              Upload a Video
            </DialogTitle>
          </DialogHeader>

          <form
            className="grid gap-6 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();

              form.handleSubmit();
            }}
          >
            <form.Field
              name="title"
              validators={{
                onBlur: ({ value }) => {
                  if (value === null || value.length === 0) {
                    return;
                  }

                  if (value.length < 3) {
                    return "Title must be 3 characters or more";
                  }

                  if (value.length > 100) {
                    return "Title must be 100 characters or less";
                  }
                },
                onSubmit: ({ value }) => {
                  if (value === null || value.length === 0) {
                    return "Title is required";
                  }

                  if (value.length < 3) {
                    return "Title must be 3 characters or more";
                  }

                  if (value.length > 100) {
                    return "Title must be 100 characters or less";
                  }
                },
              }}
              children={(field) => (
                <div className="grid gap-2">
                  <Label
                    htmlFor={field.name}
                    className="text-sm font-medium text-zinc-200"
                  >
                    Title
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value ?? ""}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter video title (leave blank to use file name)"
                    className="h-10 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />

            <form.Field
              name="file"
              validators={{
                onChange: ({ value }) => {
                  console.log(value);
                  if (!value) {
                    return "File is required";
                  }

                  if (value.size > userMaxFileUploadSize) {
                    return `File size must be less than ${humanFileSize(userMaxFileUploadSize)}`;
                  }

                  if (
                    value.size + userTotalStorageUsed >
                    userTotalStorageAvailable
                  ) {
                    return `You have used ${humanFileSize(userTotalStorageUsed)} of your storage, you can only upload up to ${humanFileSize(userTotalStorageAvailable)}`;
                  }

                  return;
                },
                onSubmit: ({ value }) => {
                  if (!value) {
                    return "You must have a file selected to upload";
                  }
                },
              }}
              children={(field) => {
                return (
                  <div className="grid gap-2">
                    <Label
                      className="text-sm font-medium text-zinc-200"
                      htmlFor={field.name}
                    >
                      Video File
                    </Label>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-lg p-6 transition-colors",
                        field.state.meta.errors.length > 0
                          ? "bg-destructive/10 border-destructive"
                          : isDragging
                            ? "bg-zinc-700/10"
                            : field.state.value
                              ? "border-green-500 bg-green-500/10"
                              : "border-zinc-700 hover:border-zinc-600"
                      )}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleFileChange(e.dataTransfer.files?.[0] ?? null);
                      }}
                      onClick={() => {
                        fileInputRef?.current?.click();
                      }}
                    >
                      <Input
                        ref={fileInputRef}
                        name={field.name}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          handleFileChange(e.target.files?.[0] ?? null);
                        }}
                      />

                      <div className="flex flex-col items-center justify-center gap-3 text-center">
                        {field.state.value ? (
                          <>
                            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                              <FileVideoIcon className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-zinc-200">
                                {field.state.value.name}
                              </p>
                              <p className="text-xs text-zinc-400">
                                {humanFileSize(field.state.value.size)}
                              </p>
                            </div>
                            <div className="flex gap-2 w-full justify-center">
                              <Button
                                variant="outline"
                                type="button"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (fileInputRef.current) {
                                    fileInputRef.current.value = "";
                                  }
                                  handleFileChange(null);
                                }}
                                className="bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700 hover:text-white"
                              >
                                <XIcon className="h-4 w-4 mr-2" /> Remove Video
                              </Button>
                              <Button
                                variant="outline"
                                type="button"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsTrimDialogOpen(true);
                                }}
                                className="bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700 hover:text-white"
                              >
                                <Scissors className="h-4 w-4 mr-2" />
                                Trim Video
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center">
                              <UploadIcon className="h-6 w-6 text-zinc-400" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-zinc-200">
                                Drag and drop your video here
                              </p>
                              <p className="text-xs text-zinc-400">
                                or click to browse files
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <FieldInfo field={field} />

                    {!field.state.value && (
                      <p className="text-xs flex items-center gap-1 text-zinc-400 mt-1">
                        <AlertCircleIcon className="h-3 w-3" />
                        Supports most video formats. (max{" "}
                        {humanFileSize(userMaxFileUploadSize)})
                      </p>
                    )}
                  </div>
                );
              }}
            />

            <form.Subscribe
              selector={(state) =>
                state.isValid && !state.isSubmitting && !state.isValidating
              }
              children={(isValid) => (
                <Button className="w-full" disabled={!isValid} type="submit">
                  Upload Video
                </Button>
              )}
            />
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

type TrimVideoDialogProps = {
  videoFile: File;
  isOpen: boolean;
  setNewVideoFile: (file: File) => void;
  onOpenChange: (open: boolean) => void;
};

function TrimVideoDialog({
  isOpen,
  onOpenChange,
  videoFile,
  setNewVideoFile,
}: TrimVideoDialogProps) {
  const ffmpegRef = useRef(new FFmpeg());
  const viewportRef = useRef<HTMLVideoElement>(null);

  const lastRangeValue = useRef<[number, number] | null>(null);
  const [rangeValues, setRangeValues] = useState<
    [number | null, number | null]
  >([null, null]);
  const [isViewportPlaying, setIsViewportPlaying] = useState(false);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number>();

  const videoUrl = useMemo(() => URL.createObjectURL(videoFile), [videoFile]);

  const { isLoading: isFfmpegLoading } = useQuery({
    refetchOnMount: true,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
    queryKey: ["loadFfmpeg"],
    queryFn: async () => {
      const ffmpeg = ffmpegRef.current;

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

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
      if (!lastRangeValue.current) {
        return false;
      }

      resetViewportToBeginning();

      const ffmpeg = ffmpegRef.current;

      await ffmpeg.writeFile("input.mp4", await fetchFile(videoFile));

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

      const file = new File([new Blob([data])], `${videoFile.name}-Trimmed`, {
        type: videoFile.type,
      });

      setNewVideoFile(file);
      handleBackToUpload();
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
      if (!viewportRef.current) {
        return;
      }

      resetViewportToBeginning();

      setIsViewportPlaying(false);
    }, playbackDuration);

    return () => {
      clearTimeout(timeout);
    };
  }, [isViewportPlaying]);

  function handleBackToUpload() {
    onOpenChange(false);
  }

  function handleRangeValueChange(value: [number, number]) {
    setRangeValues(value);
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trim Video</DialogTitle>
        </DialogHeader>
        {isFfmpegLoading && (
          <div className="flex flex-col gap-2 items-center">
            <Loader2Icon className="animate-spin" />
            Downloading required libraries. Please wait
          </div>
        )}
        {videoDurationSeconds !== undefined && !isFfmpegLoading && (
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
              <span>{formatSecondsToTimestamp(rangeValues[0] ?? 0)}</span>
              <span>
                {formatSecondsToTimestamp(
                  rangeValues[1] ?? videoDurationSeconds
                )}
              </span>
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
            <Button disabled={isRendering} onClick={() => handleBackToUpload()}>
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
