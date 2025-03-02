import { useDebounce } from "../lib/hooks/use-debounce";
import { Dialog, DialogOverlay, DialogPortal } from "@radix-ui/react-dialog";
import { Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useUploadingVideosStore } from "@/lib/stores/uploading-videos";
import { usageDataQueryOptions } from "@/lib/query-utils";
import { useQuery } from "@tanstack/react-query";
import { useDialogsStore } from "@/lib/stores/dialogs";

export function FullPageDropzone() {
  const isUploadVideoDialogOpen = useDialogsStore(
    (s) => s.isUploadVideoDialogOpen
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const debouncedIsDragOver = useDebounce(isDragOver, 50);

  const { data: usageData } = useQuery(usageDataQueryOptions);

  function validateFile(file: File) {
    const isValidMime = file.type.startsWith("video");

    const maxFileUploadSize = usageData?.maxFileUpload;
    const totalStorageUsed = usageData?.totalStorageUsed;
    const totalStorageAvailable =
      (usageData?.maxStorage ?? 0) - (usageData?.totalStorageUsed ?? 0);

    if (!isValidMime) {
      setErrorMessage("Invalid file type");
      return false;
    }

    if (
      maxFileUploadSize !== undefined &&
      maxFileUploadSize > 0 &&
      file.size > maxFileUploadSize
    ) {
      setErrorMessage(
        "File too big! Upgrade your account to a paid tier upload larger files"
      );
      return false;
    }

    if (
      totalStorageUsed === undefined ||
      totalStorageUsed + file.size > totalStorageAvailable
    ) {
      setErrorMessage("Uploading this video would exceed your storage limits");
      return false;
    }

    return true;
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: not needed
  useEffect(() => {
    let timeout: Timer;

    if (errorMessage) {
      timeout = setTimeout(() => {
        setIsDragOver(false);

        setTimeout(() => {
          setErrorMessage(undefined);
        }, 250);
      }, 1000);
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [errorMessage, debouncedIsDragOver]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: not needed
  useEffect(() => {
    const controller = new AbortController();

    if (window !== undefined) {
      window.addEventListener(
        "dragover",
        (e) => {
          e.preventDefault();

          if (isUploadVideoDialogOpen) {
            return;
          }

          const file = e.dataTransfer?.files[0];

          if (file) {
            validateFile(file);
          }

          setIsDragOver(true);
        },
        { signal: controller.signal }
      );

      window.addEventListener(
        "dragleave",
        (e) => {
          e.preventDefault();
          setIsDragOver(false);
        },
        { signal: controller.signal }
      );

      window.addEventListener(
        "drop",
        (e) => {
          e.preventDefault();

          if (isUploadVideoDialogOpen) {
            return;
          }

          const fileToUpload = e.dataTransfer?.files[0];

          if (fileToUpload) {
            if (validateFile(fileToUpload)) {
              setIsDragOver(false);
              useUploadingVideosStore
                .getState()
                .addVideo({ file: fileToUpload, title: fileToUpload.name });
            }
          }
        },
        { signal: controller.signal }
      );
    }

    return () => {
      controller.abort();
    };
  }, [isUploadVideoDialogOpen]);

  return (
    <Dialog open={debouncedIsDragOver}>
      <DialogPortal>
        <DialogOverlay className="flex items-center p-8 justify-center fixed inset-0 z-[99999] bg-black/80 backdrop-blur-[2px]  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <div className="border-2 border-border rounded-lg border-dashed w-full h-full flex items-center justify-center flex-col gap-4">
            {errorMessage === undefined ? (
              <Upload className="w-16 h-16 text-secondary" />
            ) : (
              <X className="w-16 h-16 text-secondary" />
            )}
            <div className="text-center">
              <p className="font-bold text-white">Upload Your Video</p>
              <p className="text-neutral-300 dark:text-neutral-500">
                Drag or drop your video here to upload
              </p>
              {errorMessage !== undefined && (
                <p className="text-destructive">{errorMessage}</p>
              )}
            </div>
          </div>
        </DialogOverlay>
      </DialogPortal>
    </Dialog>
  );
}
