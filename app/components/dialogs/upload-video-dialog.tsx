import { HumanFileSizeMotion } from "../human-file-size-motion";
import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@radix-ui/react-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import { type FieldApi, useForm } from "@tanstack/react-form";
import { Scissors } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useUploadingVideosStore } from "@/lib/stores/uploading-videos";
import { useQuery } from "@tanstack/react-query";
import { usageDataQueryOptions } from "@/lib/query-utils";
import { useDialogsStore } from "@/lib/stores/dialogs";

type FormData = {
  title: string | null;
  file: File | null;
};

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

  const maxFileUploadSize = usageData?.maxFileUpload;
  const totalStorageUsed = usageData?.totalStorageUsed;
  const totalStorageAvailable =
    (usageData?.maxStorage ?? 0) - (usageData?.totalStorageUsed ?? 0);

  const openTrimVideoDialog = useDialogsStore(
    (state) => state.openTrimVideoDialog
  );
  const closeUploadVideoDialog = useDialogsStore(
    (state) => state.closeUploadVideoDialog
  );
  const isUploadVideoDialogOpen = useDialogsStore(
    (state) => state.isUploadVideoDialogOpen
  );
  const uploadVideoDialogData = useDialogsStore(
    (state) => state.isUploadVideoDialogData
  );
  const openUploadVideoDialog = useDialogsStore(
    (state) => state.openUploadVideoDialog
  );

  const { addVideo } = useUploadingVideosStore();

  const getVideoTitleFromFileName = useCallback((name: string) => {
    const title = name.split(".");

    if (title.length > 1) {
      title.length--;
    }

    return title.join(".").substring(0, 99);
  }, []);

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

      closeUploadVideoDialog();
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: only check for trimmed video when dialog is opened
  useEffect(() => {
    form.reset();

    if (isUploadVideoDialogOpen && uploadVideoDialogData) {
      form.update({
        defaultValues: {
          file: uploadVideoDialogData.videoFile,
          title: `${getVideoTitleFromFileName(
            uploadVideoDialogData.videoTitle
          )} - Trimmed`,
        },
      });
    }
  }, [isUploadVideoDialogOpen]);

  return (
    <Credenza
      onOpenChange={(o) => {
        if (!o) {
          closeUploadVideoDialog();
        } else {
          openUploadVideoDialog();
        }
      }}
      open={isUploadVideoDialogOpen}
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
            validators={{
              onSubmit: ({ value }) => {
                if (value && value.length > 100)
                  return "Title must be 100 characters or less";
                return undefined;
              },
            }}
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
                  <FieldInfo field={field} />
                </div>
              );
            }}
          />
          <form.Field
            name="file"
            validators={{
              onChange: ({ value }) => {
                const fileSize = value?.size ?? 0;

                if (
                  maxFileUploadSize !== undefined &&
                  fileSize > maxFileUploadSize
                ) {
                  return "File size exceeds maximum file upload size for your account tier";
                }

                if (
                  totalStorageUsed === undefined ||
                  fileSize + totalStorageUsed > totalStorageAvailable
                ) {
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
                        ({<HumanFileSizeMotion size={field.state.value.size} />}
                        )
                      </span>
                    )}{" "}
                  </Label>
                  {uploadVideoDialogData?.videoFile ? (
                    <Input disabled placeholder="Using trimmed file" />
                  ) : (
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        if (e.target.files) {
                          field.handleChange(e.target.files[0]);
                        }
                      }}
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
                          Once you select a file, you can choose to trim the
                          video to reduce it's total size and show the key
                          moment
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

                              openTrimVideoDialog(
                                file,
                                form.state.values.title ?? file.name
                              );
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
                  className="w-full bg-red-500 hover:bg-red-600 text-primary mt-2"
                  type="button"
                  onMouseDown={() => {
                    closeUploadVideoDialog();
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
