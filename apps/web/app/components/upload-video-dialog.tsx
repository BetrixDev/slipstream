import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useAtom } from "jotai";
import { isUploadDialogOpenAtom } from "~/atoms";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { FieldInfo } from "./edit-video-dialog";
import { useEffect } from "react";
import { useUploadingVideosStore } from "~/stores";

type FormData = {
  title?: string;
  file: File;
};

export function UploadVideoDialogContainer() {
  const [isUploadDialogOpen] = useAtom(isUploadDialogOpenAtom);

  if (!isUploadDialogOpen) {
    return null;
  }

  return <UploadVideoDialog />;
}

function UploadVideoDialog() {
  const queryClient = useQueryClient();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useAtom(isUploadDialogOpenAtom);

  const { addVideo } = useUploadingVideosStore();

  const form = useForm<FormData>({
    onSubmit: ({ value }) => {
      const videoTitle = (
        (value.title?.trim().length ?? 0) > 0 ? value.title?.trim() : value.file.name
      ) as string;

      addVideo({ title: videoTitle, file: value.file });

      setIsUploadDialogOpen(false);
    },
  });

  useEffect(() => {
    form.reset();
  }, [isUploadDialogOpen]);

  return (
    <Dialog
      onOpenChange={(o) => {
        setIsUploadDialogOpen(o);
      }}
      open={isUploadDialogOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a Video</DialogTitle>
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

                const totalStorageUsed =
                  queryClient.getQueryData<number>(["totalStorageUsed"]) ?? 0;

                const totalStorageAvailable =
                  queryClient.getQueryData<number>(["totalStorageAvailable"]) ?? 0;

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
                  <Label htmlFor={field.name}>File</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.files![0])}
                    type="file"
                    required
                    accept="video/*"
                  />
                  <FieldInfo field={field} />
                </div>
              );
            }}
          />
          <Button
            disabled={!form.state.isFormValid}
            className="w-full bg-blue-500 hover:bg-blue-600 text-primary mt-2"
            type="button"
            onMouseDown={() => {
              form.handleSubmit();
            }}
          >
            Upload Video
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
