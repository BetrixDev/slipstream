"use client";

import { useAtom } from "jotai";
import { editVideoAtom } from "../../atoms";
import { useUserVideoDatastore } from "../../stores/user-video-data";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FieldInfo } from "./upload-video-dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateVideoData } from "../../actions";
import { useEffect } from "react";

type FormData = {
  title?: string;
  isPrivate?: boolean;
};

export function EditVideoDialog() {
  const router = useRouter();
  const videos = useUserVideoDatastore((s) => s.videos);
  const setVideos = useUserVideoDatastore((s) => s.setVideos);
  const [editVideo, setEditVideo] = useAtom(editVideoAtom);

  const videoData = videos.find((v) => v.id === editVideo?.id);

  async function handleUpdateVideo(data: FormData) {
    try {
      if (editVideo === undefined) {
        return;
      }

      setVideos(
        videos.map((v) => {
          if (v.id === editVideo.id) {
            return { ...v, ...data };
          } else {
            return v;
          }
        }),
      );

      setEditVideo(undefined);

      const result = await updateVideoData(editVideo.id, data);

      if (!result.success) {
        toast.error("An error occurred while editing the video.", {
          description: result.message,
        });
      } else {
        toast.success(result.message, { description: result.description });
      }
    } catch {
      toast.error("An error occurred while editing the video.", {
        description: "Please try again",
      });
      router.refresh();
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

  useEffect(() => {
    form.reset();
  }, [editVideo]);

  if (editVideo === undefined) {
    return null;
  } else if (videoData === undefined) {
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
              onChange: ({ value }) => (!value ? "A video title is required" : undefined),
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
              className="grow basis-1/2 bg-blue-600 text-white"
              type="button"
              onMouseDown={() => {
                form.handleSubmit();
              }}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
