import { useAtom } from "jotai";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { deleteVideoAtom } from "~/atoms";
import { Button } from "./ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRevalidator } from "@remix-run/react";

export function DeleteVideoDialog() {
  const queryClient = useQueryClient();
  const { revalidate } = useRevalidator();
  const [deleteVideo, setDeleteVideo] = useAtom(deleteVideoAtom);

  const { mutate } = useMutation({
    mutationFn: async () => {
      if (deleteVideo === undefined) {
        return;
      }

      const videosQueryData = queryClient.getQueryData(["videos"]) as {
        id: string;
      }[];

      queryClient.setQueryData(
        ["videos"],
        videosQueryData.filter((video) => video.id !== deleteVideo.id),
      );

      const videoId = deleteVideo.id;

      setDeleteVideo(undefined);

      return fetch("/api/deleteVideo", {
        method: "POST",
        body: JSON.stringify({ videoId: videoId }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onError: (e) => {
      revalidate();
      toast.error("Failed to delete video.", { description: e.message });
    },
    onSuccess: async (e) => {
      if (!e) {
        toast.success("Video deleted");
        return;
      }

      const json = await e.json();

      toast.success("Video deleted", {
        description: json.title,
      });
    },
  });

  if (deleteVideo === undefined) {
    return null;
  }

  return (
    <Dialog
      onOpenChange={(o) => {
        if (!o) {
          setDeleteVideo(undefined);
        }
      }}
      open={deleteVideo !== undefined}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Video Deletion</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-medium">{deleteVideo.name}</span>?
          </DialogDescription>
          <div className="flex gap-2">
            <Button
              className="grow"
              onClick={() => {
                setDeleteVideo(undefined);
              }}
            >
              Cancel
            </Button>
            <Button
              className="grow"
              variant="destructive"
              onClick={() => {
                mutate();
              }}
            >
              Delete
            </Button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
