import { useRevalidator } from "@remix-run/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { editVideoAtom } from "~/atoms";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Switch } from "./ui/switch";
import { useForm } from "@tanstack/react-form";
import type { FieldApi } from "@tanstack/react-form";

type FormData = {
  title?: string;
  isPrivate?: boolean;
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

export function EditVideoDialog() {
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();
  const [editVideo, setEditVideo] = useAtom(editVideoAtom);

  const videosQueryData = queryClient.getQueryData(["videos"]) as {
    id: string;
    title: string;
    isPrivate: boolean;
  }[];

  const { mutate: updateVideo } = useMutation({
    mutationFn: async (data: FormData) => {
      if (editVideo === undefined) {
        return;
      }

      queryClient.setQueryData(
        ["videos"],
        videosQueryData.map((v) => {
          if (v.id === editVideo.id) {
            return { ...v, ...data };
          }

          return v;
        }),
      );

      setEditVideo(undefined);

      return fetch("/api/editVideo", {
        method: "POST",
        body: JSON.stringify({ id: editVideo.id, ...data }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onError: () => {
      toast.error("An error occurred while editing the video.");
      revalidator.revalidate();
    },
    onSuccess: async (e) => {
      if (!e) {
        toast.success("Video has been updated.");
        return;
      }

      const json = await e.json();

      toast.success("Video has been updated.", {
        description: json.title,
      });
    },
  });

  const videoData = videosQueryData?.find((v) => v.id === editVideo?.id);

  const form = useForm<FormData>({
    defaultValues: {
      title: videoData?.title,
      isPrivate: videoData?.isPrivate,
    },
    onSubmit: async ({ value }) => {
      if (!form.state.isPristine) {
        updateVideo(value);
      } else {
        setEditVideo(undefined);
      }
      form.reset();
    },
  });

  if (editVideo === undefined || videoData === undefined) {
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
              className="grow"
              onClick={() => {
                setEditVideo(undefined);
              }}
            >
              Cancel
            </Button>
            <Button
              className="grow bg-blue-600 text-white"
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
