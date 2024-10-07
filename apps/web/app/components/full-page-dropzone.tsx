import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";
import { useUploadingVideosStore } from "~/stores";

export function FullPageDropzone() {
  const [isDragOver, setIsDragOver] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    if (window !== undefined) {
      window.addEventListener(
        "dragover",
        (e) => {
          e.preventDefault();
          setIsDragOver(true);
        },
        { signal: controller.signal },
      );

      window.addEventListener(
        "dragleave",
        (e) => {
          e.preventDefault();
          setIsDragOver(false);
        },
        { signal: controller.signal },
      );

      window.addEventListener(
        "drop",
        (e) => {
          e.preventDefault();

          const fileToUpload = e.dataTransfer?.files[0];

          if (fileToUpload) {
            useUploadingVideosStore
              .getState()
              .addVideo({ file: fileToUpload, title: fileToUpload.name });
          }
        },
        { signal: controller.signal },
      );
    }

    return () => {
      controller.abort();
    };
  }, []);

  return <div className="h-screen w-screen contents relative"></div>;
}
