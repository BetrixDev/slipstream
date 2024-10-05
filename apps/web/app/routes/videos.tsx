/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LoaderFunctionArgs, MetaFunction } from "@vercel/remix";
import { getAuth } from "@clerk/remix/ssr.server";
import { redirect, type SerializeFrom } from "@remix-run/node";
import { Card } from "~/components/ui/card";
import { Await, Link, useLoaderData, useRevalidator } from "@remix-run/react";
import { Upload } from "lucide-react";
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
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { defer } from "@vercel/remix";
import { DeleteVideoDialog } from "~/components/delete-video-dialog";
import { EditVideoDialog } from "~/components/edit-video-dialog";
import { VideosBoard } from "~/components/videos-board";
import { humanFileSize } from "~/lib/utils";
import { Footer } from "~/components/Footer";
import { PLAN_STORAGE_SIZES } from "cms";

export const meta: MetaFunction = () => {
  return [
    {
      title: "Your Videos | Flowble",
    },
  ];
};

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);

  if (userId === null) {
    return redirect("/");
  }

  const userData = db.query.users
    .findFirst({
      where: (table, { eq }) => eq(table.id, userId),
      columns: {
        accountTier: true,
        totalStorageUsed: true,
      },
    })
    .execute();

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
        smallThumbnailUrl: true,
        videoLengthSeconds: true,
        isProcessing: true,
      },
    })
    .execute();

  return defer({
    videos: userVideos,
    userData,
  });
}

function VideosDashboard() {
  const revalidator = useRevalidator();
  const { videos, userData } = useLoaderData<typeof loader>();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadingTitle, setUploadingTitle] = useState("");
  const [uploadSize, setUploadSize] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { mutate: onFormSubmit, isPending: isUploading } = useMutation({
    mutationFn: async (e: HTMLFormElement) => {
      const eventFormData = new FormData(e);
      const file = eventFormData.get("file") as File;
      const videoTitle =
        (eventFormData.get("title") as string)?.length > 0
          ? (eventFormData.get("title") as string)
          : file.name;

      const presigned = await axios<
        SerializeFrom<typeof import("~/routes/api.beginUpload").action>
      >("/api/beginUpload", {
        method: "POST",
        data: {
          contentLength: file.size,
        },
      });

      if (!presigned.data?.url) {
        throw new Error("No presigned url");
      }

      setUploadingTitle(videoTitle);
      setUploadProgress(0);
      setUploadSize(file.size);
      setIsDialogOpen(false);

      await axios(presigned.data.url!, {
        onUploadProgress: (e) => {
          setUploadProgress((e.progress ?? 0) * 100);
        },
        data: file,
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });

      await axios("/api/uploadComplete", {
        method: "POST",
        data: {
          key: presigned.data.key,
          title: videoTitle,
        },
      });
    },
    onSuccess: () => {
      console.log("success");
      revalidator.revalidate();
    },
    onError: (e: AxiosError) => {
      if (e.status === 413) {
        toast.error("Not enough storage space!", {
          description:
            "You do not have enough storage space left in your current plan to upload a video this large. Please delete videos or upload your plan to continue.",
          action: "View Plans",
        });
      }

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
            <div className="flex flex-col-reverse md:flex-row items-center md:gap-8">
              <Suspense>
                <Await resolve={userData}>
                  {(userData) => (
                    <Link to="/pricing">
                      <Button variant="ghost" className="h-12 text-md">
                        Storage used: {humanFileSize(userData.totalStorageUsed)} /{" "}
                        {humanFileSize(PLAN_STORAGE_SIZES[userData.accountTier])}
                      </Button>
                    </Link>
                  )}
                </Await>
              </Suspense>
              <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
                <Button
                  onMouseDown={() => setIsDialogOpen(true)}
                  variant="ghost"
                  className="relative inline-flex h-12 overflow-hidden rounded-md p-[1px] focus:outline-none focus:ring-2 hover:ring-2 focus:ring-offset-2"
                >
                  <span className="absolute inset-[-1000%] animate-[spin_5s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                  <span className="text-lg inline-flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-background px-3 py-1 font-medium text-primary backdrop-blur-3xl">
                    <Upload /> Upload a Video
                  </span>
                </Button>
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
          </div>
          <Separator />
          <div className="container flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <Await resolve={videos}>{(videos) => <VideosBoard videos={videos as any} />}</Await>
              </Suspense>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}

export default VideosDashboard;
