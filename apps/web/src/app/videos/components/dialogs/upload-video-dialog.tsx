"use client";

import { useAtom, useSetAtom } from "jotai";
import { customFileToUploadAtom, isUploadDialogOpenAtom, trimVideoDataAtom } from "../../atoms";
import { Credenza, CredenzaContent, CredenzaHeader, CredenzaTitle } from "@/components/ui/credenza";
import { type FieldApi, useForm } from "@tanstack/react-form";
import { useUploadingVideosStore } from "../../stores/uploading-videos";
import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useUserVideoDatastore } from "../../stores/user-video-data";
import { HumanFileSizeMotion } from "@/components/human-file-size-motion";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@radix-ui/react-dialog";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";
import { Scissors } from "lucide-react";

type FormData = {
  title: string | null;
  file: File | null;
};

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
  const [isUploadDialogOpen] = useAtom(isUploadDialogOpenAtom);

  if (!isUploadDialogOpen) {
    return null;
  }

  return <UploadVideoDialogChild />;
}

function UploadVideoDialogChild() {
  const maxFileUploadSize = useUserVideoDatastore((s) => s.maxFileUploadSize);
  const totalStorageUsed = useUserVideoDatastore((s) => s.totalStorageUsed);
  const totalStorageAvailable = useUserVideoDatastore((s) => s.totalStorageAvailable);

  const setTrimVideoData = useSetAtom(trimVideoDataAtom);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useAtom(isUploadDialogOpenAtom);
  const [customFileToUpload, setCustomFileToUpload] = useAtom(customFileToUploadAtom);

  const { addVideo } = useUploadingVideosStore();

  function getVideoTitleFromFileName(name: string) {
    const title = name.split(".");

    if (title.length > 1) {
      title.length--;
    }

    return title.join(".");
  }

  const form = useForm<FormData>({
    defaultValues: {
      file: null,
      title: null,
    },
    onSubmit: ({ value }) => {
      if (!value.file) {
        return;
      }

      const videoTitle = (
        (value.title?.trim().length ?? 0) > 0
          ? value.title?.trim()
          : getVideoTitleFromFileName(value.file.name)
      ) as string;

      addVideo({ title: videoTitle, file: value.file });

      setIsUploadDialogOpen(false);
    },
  });

  useEffect(() => {
    form.reset();

    if (isUploadDialogOpen && customFileToUpload) {
      form.update({
        defaultValues: {
          file: customFileToUpload,
          title: `${getVideoTitleFromFileName(customFileToUpload.name)} - Trimmed`,
        },
      });
    }
  }, [isUploadDialogOpen]);

  return (
    <Credenza
      onOpenChange={(o) => {
        setIsUploadDialogOpen(o);

        if (!o) {
          setCustomFileToUpload(undefined);
        }
      }}
      open={isUploadDialogOpen}
    >
      <CredenzaContent>
        <CredenzaHeader>
          <CredenzaTitle>Upload a Video</CredenzaTitle>
        </CredenzaHeader>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="title"
            children={(field) => {
              return (
                <div>
                  <Label htmlFor={field.name}>Title</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value ?? undefined}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter video title (leave blank to use file name)"
                    className="dark:bg-gray-800 border-gray-700 mt-1"
                  />
                </div>
              );
            }}
          />
          <form.Field
            name="file"
            validators={{
              onChange: ({ value }) => {
                const fileSize = value?.size ?? 0;

                if (maxFileUploadSize !== undefined && fileSize > maxFileUploadSize) {
                  return "File size exceeds maximum file upload size for your account tier";
                }

                if (fileSize + totalStorageUsed > totalStorageAvailable) {
                  return "You do not have enough storage available";
                }
              },
              onSubmit: ({ value }) => {
                if (!value) {
                  return "You must have a file selected to upload";
                }
              },
            }}
            children={(field) => {
              return (
                <div>
                  <Label htmlFor={field.name}>
                    File{" "}
                    {field.state.value && (
                      <span className="text-muted">
                        ({<HumanFileSizeMotion size={field.state.value.size} />})
                      </span>
                    )}{" "}
                  </Label>
                  {customFileToUpload ? (
                    <Input disabled placeholder="Using trimmed file" />
                  ) : (
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.files![0])}
                      type="file"
                      required
                      accept="video/*"
                    />
                  )}

                  <FieldInfo field={field} />
                </div>
              );
            }}
          />
          <form.Subscribe selector={(state) => state.values.file}>
            {(file) => {
              if (file === null) {
                return null;
              }

              return (
                <DialogClose asChild>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipContent>
                        <p>
                          Once you select a file, you can choose to trim the video to reduce it's
                          total size and show the key moment
                        </p>
                      </TooltipContent>
                      <TooltipTrigger asChild>
                        <DialogClose asChild>
                          <Button
                            disabled={file === undefined}
                            className="h-8 flex gap-2 w-full"
                            variant="outline"
                            type="button"
                            onClick={() => {
                              if (!file) {
                                return;
                              }

                              setTrimVideoData({ file: file, title: form.state.values.title });
                            }}
                          >
                            <Scissors className="h-4 w-4" /> Trim Video
                          </Button>
                        </DialogClose>
                      </TooltipTrigger>
                    </Tooltip>
                  </TooltipProvider>
                </DialogClose>
              );
            }}
          </form.Subscribe>
          <form.Subscribe selector={(state) => state}>
            {(state) => {
              return (
                <Button
                  disabled={!state.isValid}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white mt-2"
                  type="button"
                  onMouseDown={() => {
                    setCustomFileToUpload(undefined);
                    form.handleSubmit();
                  }}
                >
                  Upload Video
                </Button>
              );
            }}
          </form.Subscribe>
        </form>
      </CredenzaContent>
    </Credenza>
  );
}
