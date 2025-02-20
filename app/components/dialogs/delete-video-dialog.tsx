import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza";
import { useAtom } from "jotai";
import { toast } from "sonner";
import { deleteVideoAtom } from "@/lib/atoms";
import { usageDataQueryOptions, videosQueryOptions } from "@/lib/query-utils";
import { notNanOrDefault } from "@/lib/utils";
import { queryClient } from "@/routes/__root";
import { deleteVideoServerFn } from "@/server-fns/videos";

export function DeleteVideoDialog() {
  const [deleteVideoData, setDeleteVideoData] = useAtom(deleteVideoAtom);

  async function doDeleteVideo() {
    if (!deleteVideoData) {
      return;
    }

    const oldVideos = queryClient.getQueryData(videosQueryOptions.queryKey);
    const oldUsageData = queryClient.getQueryData(
      usageDataQueryOptions.queryKey
    );

    function reset(message?: string) {
      console.log("resetting videos to ", oldVideos);
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

      const video = videos.find((v) => v.id === deleteVideoData.id);

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
          videos: videos.filter((v) => v.id !== deleteVideoData.id),
        };
      });

      setDeleteVideoData(undefined);

      const result = await deleteVideoServerFn({
        data: { videoId: deleteVideoData.id },
      });

      if (!result.success) {
        reset(result.message);
      } else {
        toast.success("Video deleted", {
          description: result.message,
        });
      }
    } catch (e) {
      console.error(e);
      reset();
    }
  }

  if (deleteVideoData === undefined) {
    return null;
  }

  return (
    <Credenza
      onOpenChange={(o) => {
        if (!o) {
          setDeleteVideoData(undefined);
        }
      }}
      open={deleteVideoData !== undefined}
    >
      <CredenzaContent>
        <CredenzaHeader>
          <CredenzaTitle>Confirm Video Deletion</CredenzaTitle>
          <CredenzaDescription>
            Are you sure you want to delete{" "}
            <strong>{deleteVideoData.name}</strong>?
          </CredenzaDescription>
        </CredenzaHeader>
        <div className="flex gap-2 items-end">
          <Button
            className="grow"
            onMouseDown={() => {
              setDeleteVideoData(undefined);
            }}
          >
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
