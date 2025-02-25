import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useForm } from "@tanstack/react-form";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { toast } from "sonner";
import { FieldInfo } from "./upload-video-dialog";
import { useRouter } from "@tanstack/react-router";
import { editVideoAtom } from "@/lib/atoms";
import { updateVideoDataServerFn } from "@/server-fns/videos";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { videosQueryOptions } from "@/lib/query-utils";

type FormData = {
  title?: string;
  isPrivate?: boolean;
};

export function EditVideoDialog() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useQuery(videosQueryOptions);
  const [editVideo, setEditVideo] = useAtom(editVideoAtom);

  const videoData = data?.videos.find((v) => v.id === editVideo?.id);

  async function handleUpdateVideo(data: FormData) {
    try {
      if (editVideo === undefined) {
        return;
      }

      // Optimistically update the UI
      queryClient.setQueryData(videosQueryOptions.queryKey, (old) => ({
        ...old,
        videos: (old?.videos ?? []).map((v) => {
          if (v.id === editVideo.id) {
            return { ...v, ...data };
          }
          return v;
        }),
      }));

      setEditVideo(undefined);

      const result = await updateVideoDataServerFn({
        data: { videoId: editVideo.id, data },
      });

      if (!result.success) {
        queryClient.invalidateQueries(videosQueryOptions);

        toast.error("An error occurred while editing the video.", {
          description: result.message,
        });
      } else {
        toast.success(result.message, { description: result.description });
      }
    } catch {
      queryClient.invalidateQueries(videosQueryOptions);

      toast.error("An error occurred while editing the video.", {
        description: "Please try again",
      });
      // TODO: this might not be the best way to do this
      router.navigate({ to: "/videos" });
    }
  }

  const form = useForm<FormData>({
    defaultValues: {
      title: videoData?.title,
      isPrivate: videoData?.isPrivate,
    },
    onSubmit: async ({ value }) => {
      if (!form.state.isPristine) {
        handleUpdateVideo(value);
      } else {
        setEditVideo(undefined);
      }
      form.reset();
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: only should react to editVideo changes
  useEffect(() => {
    form.reset();
  }, [editVideo]);

  if (editVideo === undefined) {
    return null;
  }

  if (videoData === undefined) {
    setEditVideo(undefined);
    return null;
  }

  return (
    <Dialog
      onOpenChange={(o) => {
        if (!o) {
          setEditVideo(undefined);
        }
      }}
      open={editVideo !== undefined}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {editVideo.name}</DialogTitle>
        </DialogHeader>
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
              onChange: ({ value }) => {
                if (!value) return "A video title is required";
                if (value.length > 100)
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
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldInfo field={field} />
                </div>
              );
            }}
          />
          <form.Field
            name="isPrivate"
            children={(field) => {
              return (
                <div>
                  <Label htmlFor={field.name}>Video Visibility</Label>
                  <div className="flex items-center gap-2 text-sm">
                    Unlisted
                    <Switch
                      id={field.name}
                      name={field.name}
                      checked={field.state.value}
                      onBlur={field.handleBlur}
                      onCheckedChange={(e) => field.handleChange(e)}
                    />
                    Private
                  </div>
                </div>
              );
            }}
          />
          <div className="flex gap-2 mt-2">
            <Button
              className="grow basis-1/2"
              onClick={() => {
                setEditVideo(undefined);
              }}
            >
              Cancel
            </Button>
            <Button
              className="grow basis-1/2 bg-red-600 text-white"
              type="submit"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
