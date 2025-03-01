import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza";
import { toast } from "sonner";
import { usageDataQueryOptions, videosQueryOptions } from "@/lib/query-utils";
import { notNanOrDefault } from "@/lib/utils";
import { queryClient } from "@/routes/__root";
import { deleteVideoServerFn } from "@/server-fns/videos";
import { useDialogsStore } from "@/lib/stores/dialogs";

export function DeleteVideoDialog() {
  const closeDeleteVideoDialog = useDialogsStore(
    (state) => state.closeDeleteVideoDialog
  );
  const deleteVideoDialogData = useDialogsStore(
    (state) => state.deleteVideoDialogData
  );
  const isDeleteVideoDialogOpen = useDialogsStore(
    (state) => state.isDeleteVideoDialogOpen
  );

  async function doDeleteVideo() {
    if (!isDeleteVideoDialogOpen || !deleteVideoDialogData) {
      return;
    }

    const oldVideos = queryClient.getQueryData(videosQueryOptions.queryKey);
    const oldUsageData = queryClient.getQueryData(
      usageDataQueryOptions.queryKey
    );

    function reset(message?: string) {
      queryClient.setQueryData(usageDataQueryOptions.queryKey, oldUsageData);

      queryClient.setQueryData(videosQueryOptions.queryKey, (old) => {
        return {
          ...old,
          videos: oldVideos?.videos ?? [],
        };
      });

      toast.error("Failed to delete video.", { description: message });
    }

    try {
      const videos =
        queryClient.getQueryData(videosQueryOptions.queryKey)?.videos ?? [];

      const video = videos.find((v) => v.id === deleteVideoDialogData.videoId);

      queryClient.setQueryData(usageDataQueryOptions.queryKey, (old) => {
        console.log(old);
        return {
          totalStorageUsed: Math.max(
            old?.totalStorageUsed ?? 0 - notNanOrDefault(video?.fileSizeBytes),
            0
          ),
          maxStorage: old?.maxStorage ?? 0,
          maxFileUpload: old?.maxFileUpload ?? undefined,
        };
      });

      queryClient.setQueryData(videosQueryOptions.queryKey, (old) => {
        return {
          ...old,
          videos: videos.filter((v) => v.id !== deleteVideoDialogData.videoId),
        };
      });

      closeDeleteVideoDialog();

      toast.promise(
        deleteVideoServerFn({
          data: { videoId: deleteVideoDialogData.videoId },
        }),
        {
          loading: "Queueing video for deletion...",
          error: "Error deleting video",
          success: (result) => result.message,
        }
      );
    } catch (e) {
      console.error(e);
      reset();
    }
  }

  if (!isDeleteVideoDialogOpen || !deleteVideoDialogData) {
    return null;
  }

  return (
    <Credenza
      onOpenChange={(o) => {
        if (!o) {
          closeDeleteVideoDialog();
        }
      }}
      open={isDeleteVideoDialogOpen}
    >
      <CredenzaContent>
        <CredenzaHeader>
          <CredenzaTitle>Confirm Video Deletion</CredenzaTitle>
          <CredenzaDescription>
            Are you sure you want to delete{" "}
            <strong>{deleteVideoDialogData.videoTitle}</strong>?
          </CredenzaDescription>
        </CredenzaHeader>
        <div className="flex gap-2 items-end">
          <Button className="grow" onMouseDown={closeDeleteVideoDialog}>
            Cancel
          </Button>
          <Button
            className="grow"
            variant="destructive"
            onMouseDown={() => {
              doDeleteVideo();
            }}
          >
            Delete
          </Button>
        </div>
      </CredenzaContent>
    </Credenza>
  );
}
