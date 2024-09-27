/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LoaderFunctionArgs } from "@vercel/remix";
import { getAuth } from "@clerk/remix/ssr.server";
import { redirect, type SerializeFrom } from "@remix-run/node";
import { Card } from "~/components/ui/card";
import { Await, Link, useLoaderData, useRevalidator } from "@remix-run/react";
import { Upload, Eye, Copy } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { db } from "db";
import { Suspense, useState } from "react";
import { Progress } from "~/components/ui/progress";
import TopNav from "~/components/TopNav";
import { Separator } from "~/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { defer } from "@vercel/remix";
import { DeleteVideoDialog } from "~/components/delete-video-dialog";
import { useAtom } from "jotai";
import { deleteVideoAtom, editVideoAtom } from "~/atoms";
import { EditVideoDialog } from "~/components/edit-video-dialog";

function humanFileSize(size: number) {
  const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return +(size / Math.pow(1024, i)).toFixed(2) * 1 + " " + ["B", "kB", "MB", "GB", "TB"][i];
}

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);

  if (userId === null) {
    return redirect("/");
  }

  const userVideos = db.query.videos
    .findMany({
      where: (table, { eq }) => eq(table.authorId, userId),
      orderBy: (table, { desc }) => desc(table.createdAt),
      limit: 36,
      columns: {
        fileSizeBytes: true,
        views: true,
        title: true,
        id: true,
        isPrivate: true,
      },
    })
    .execute();

  return defer({
    videos: userVideos,
  });
}

function VideosDashboard() {
  const { revalidate } = useRevalidator();
  const { videos } = useLoaderData<typeof loader>();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadingTitle, setUploadingTitle] = useState("");
  const [uploadSize, setUploadSize] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { mutate: onFormSubmit, isPending: isUploading } = useMutation({
    mutationFn: async (e: HTMLFormElement) => {
      const presigned =
        await axios<SerializeFrom<typeof import("~/routes/api.beginUpload").loader>>(
          "/api/beginUpload",
        );

      const eventFormData = new FormData(e);
      const file = eventFormData.get("file") as File;
      const videoTitle =
        (eventFormData.get("title") as string)?.length > 0
          ? (eventFormData.get("title") as string)
          : file.name;

      const uploadFormData = new FormData();

      Object.entries(presigned.data.fields).forEach(([key, value]) => {
        uploadFormData.set(key, value);
      });
      uploadFormData.set("file", eventFormData.get("file")!);

      setUploadingTitle(videoTitle);
      setUploadProgress(0);
      setUploadSize(file.size);
      setIsDialogOpen(false);

      await axios(presigned.data.url, {
        onUploadProgress: (e) => {
          setUploadProgress((e.progress ?? 0) * 100);
        },
        data: uploadFormData,
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await axios("/api/uploadComplete", {
        method: "POST",
        data: {
          key: presigned.data.fields.key,
          title: videoTitle,
        },
      });
    },
    onSuccess: () => {
      revalidate();
    },
    onError: (e) => {
      toast.error("Failed to upload video", {
        description: "Please try again later",
      });
    },
  });

  return (
    <>
      <DeleteVideoDialog />
      <EditVideoDialog />
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="grow container space-y-8 mx-auto px-4 py-8">
          <div className="flex gap-2 items-center justify-between">
            <h1 className="text-2xl font-bold">Your Videos</h1>
            <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
              <DialogTrigger>
                <Button
                  variant="ghost"
                  className="relative inline-flex h-12 overflow-hidden rounded-md p-[1px] focus:outline-none focus:ring-2 hover:ring-2 focus:ring-offset-2"
                >
                  <span className="absolute inset-[-1000%] animate-[spin_5s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                  <span className="text-lg inline-flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-background px-3 py-1 font-medium text-primary backdrop-blur-3xl">
                    <Upload /> Upload a Video
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload a video</DialogTitle>
                  <DialogDescription className="hidden">
                    Choose a video file to upload to your account
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onFormSubmit(e.currentTarget);
                  }}
                >
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      name="title"
                      placeholder="Enter file title"
                      className="dark:bg-gray-800 border-gray-700 mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="file">File</Label>
                    <Input name="file" type="file" required accept="video/*" />
                  </div>
                  <Button className="w-full bg-blue-500 hover:bg-blue-600 text-primary-foregroundS">
                    Upload file
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Separator />
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {isUploading && (
                <Card className="relative bg-card rounded-lg overflow-hidden shadow-md transition-shadow duration-300 ease-in-out hover:shadow-lg group aspect-video border-border/50 hover:border-border">
                  <Skeleton className="absolute inset-0">
                    <div className="absolute inset-0 bg-black bg-opacity-60 transition-opacity duration-300 ease-in-out group-hover:bg-opacity-40"></div>
                  </Skeleton>
                  <div className="absolute right-0 bg-black/50 p-1 rounded-md backdrop-blur-md text-xs">
                    {humanFileSize(uploadSize)}
                  </div>
                  <div className="relative z-10 p-4 h-full flex flex-col justify-end">
                    <h2 className="text-lg font-semibold line-clamp-2 text-white transition-colors duration-300 ease-in-out">
                      {uploadingTitle}
                    </h2>
                    <h6 className="text-sm text-muted-foreground">
                      Uploading {uploadProgress.toFixed(1)}%
                    </h6>
                    <Progress value={uploadProgress} />
                  </div>
                </Card>
              )}
              <Suspense fallback={<Skeleton className="rounded-lg w-full aspect-video" />}>
                <Await resolve={videos}>
                  {(videos) => <VideosLayoutWrapper videos={videos as any} />}
                </Await>
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

type VideosLayoutWrapperProps = {
  videos: { id: string; title: string; views: string; fileSizeBytes: number }[];
};

function VideosLayoutWrapper({ videos }: VideosLayoutWrapperProps) {
  const [, setDeleteVideo] = useAtom(deleteVideoAtom);
  const [, setEditVideo] = useAtom(editVideoAtom);

  const { data } = useQuery({
    queryKey: ["videos"],
    initialData: videos,
  });

  function handleCopyLink(link: string, title: string) {
    navigator.clipboard.writeText(`${window.location.origin}/p/${link}`);
    toast.success("Link copied to clipboard", {
      description: title,
    });
  }

  return data.map((video) => (
    <Card
      key={video.id}
      className="relative bg-card rounded-lg overflow-hidden shadow-md transition-shadow duration-300 ease-in-out hover:shadow-lg group aspect-video border-border/50 hover:border-border flex flex-col justify-between"
    >
      <div className="absolute inset-0">
        <img
          src="https://png.pngtree.com/background/20230616/original/pngtree-faceted-abstract-background-in-3d-with-shimmering-iridescent-metallic-texture-of-picture-image_3653595.jpg"
          alt={`${video.title} thumbnail`}
          className="transition-transform duration-200 ease-in-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black bg-opacity-60 transition-opacity duration-300 ease-in-out group-hover:bg-opacity-40"></div>
      </div>
      <div className="absolute right-0 bg-black/50 p-1 rounded-md backdrop-blur-md text-xs">
        {humanFileSize(video.fileSizeBytes)}
      </div>
      <div className="relative z-10 p-4 h-full flex flex-col justify-end">
        <Link to={`/p/${video.id}`}>
          <Button
            variant="link"
            className="text-lg font-semibold line-clamp-2 text-white transition-colors duration-300 ease-in-out p-0"
          >
            {video.title}
          </Button>
        </Link>
        <div className="flex gap-1">
          <div className="flex items-center text-sm font-medium text-white gap-1">
            <Eye className="w-4 h-4" />
            {video.views.toLocaleString()} views
          </div>
          <Button
            variant="link"
            className="text-white flex items-center gap-1"
            onClick={() => handleCopyLink(video.id, video.title)}
          >
            <Copy className="w-4 h-4" /> Copy Link
          </Button>
        </div>
      </div>
      <div className="z-10 bg-black/15 backdrop-blur-md border-t-[1px] flex">
        <Button variant="ghost" className="rounded-none grow">
          Embed
        </Button>
        <Button
          variant="ghost"
          className="rounded-none grow"
          onClick={() => {
            setEditVideo({
              id: video.id,
              name: video.title,
            });
          }}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          className="rounded-none grow"
          onClick={() => {
            setDeleteVideo({
              id: video.id,
              name: video.title,
            });
          }}
        >
          Delete
        </Button>
      </div>
    </Card>
  ));
}

export default VideosDashboard;
