import { nanoid } from "nanoid";
import { toast } from "sonner";
import { create } from "zustand";
import { queryClient } from "@/routes/__root";
import { usageDataQueryOptions, videosQueryOptions } from "../query-utils";
import { uploadFiles } from "../uploadthing";
import { UploadAbortedError } from "uploadthing/client";
import { UploadThingError } from "uploadthing/server";
import { onUploadCancelledServerFn } from "@/server-fns/videos";

type UploadingVideo = {
  id: string;
  title: string;
  file: File;
  uploadProgress: number;
  videoSizeBytes: number;
};

type UploadingVideosState = {
  uploadingVideos: UploadingVideo[];
};

type UploadingVideosActions = {
  addVideo: (
    video: Omit<UploadingVideo, "uploadProgress" | "videoSizeBytes" | "id">
  ) => void;
  removeVideo: (id: string) => void;
  setUploadProgress: (id: string, progress: number) => void;
};

export const useUploadingVideosStore = create<
  UploadingVideosState & UploadingVideosActions
>()((set) => ({
  uploadingVideos: [],
  addVideo: (video) =>
    set((state) => ({
      uploadingVideos: [
        {
          ...video,
          uploadProgress: 0,
          videoSizeBytes: video.file.size,
          id: nanoid(10),
          deletionDate: null,
        },
        ...state.uploadingVideos,
      ],
    })),
  removeVideo: (id) =>
    set((state) => ({
      uploadingVideos: state.uploadingVideos.filter((video) => video.id !== id),
    })),
  setUploadProgress: (id, progress) =>
    set((state) => ({
      uploadingVideos: state.uploadingVideos.map((video) =>
        video.id === id ? { ...video, uploadProgress: progress } : video
      ),
    })),
}));

const uploadingVideosAbortControllers = new Map<string, AbortController>();

useUploadingVideosStore.subscribe((state, oldState) => {
  const newVideos = state.uploadingVideos.filter(
    (n) => oldState.uploadingVideos.find((o) => o.id === n.id) === undefined
  );

  const removedVideos = oldState.uploadingVideos.filter(
    (o) => state.uploadingVideos.find((n) => n.id === o.id) === undefined
  );

  for (const video of newVideos) {
    handleVideoUpload(video);
  }

  for (const video of removedVideos) {
    const abortController = uploadingVideosAbortControllers.get(video.id);

    if (abortController !== undefined) {
      abortController.abort();
      uploadingVideosAbortControllers.delete(video.id);
    }
  }
});

class UploadingError extends Error {}

async function handleVideoUpload(video: UploadingVideo) {
  const abortController = new AbortController();

  uploadingVideosAbortControllers.set(video.id, abortController);

  queryClient.setQueryData(usageDataQueryOptions.queryKey, (oldData) => {
    if (!oldData) return oldData;
    return {
      ...oldData,
      totalStorageUsed: oldData.totalStorageUsed + video.file.size,
    };
  });

  try {
    toast.success(video.title, {
      description: "Getting upload details...",
    });

    const [response] = await uploadFiles("videoUploader", {
      signal: abortController.signal,
      files: [video.file],
      input: {
        title: video.title,
      },
      onUploadProgress: (data) => {
        const progress = Math.floor(data.progress);
        const currentVideo = useUploadingVideosStore
          .getState()
          .uploadingVideos.find((v) => v.id === video.id);

        if (currentVideo && progress > currentVideo.uploadProgress) {
          useUploadingVideosStore
            .getState()
            .setUploadProgress(video.id, progress);
        }
      },
      onUploadBegin: () => {
        toast.success(video.title, {
          description: "Uploading video...",
        });
      },
    });

    toast.success(video.title, {
      description: "Video uploaded successfully",
    });

    queryClient.setQueryData(videosQueryOptions.queryKey, (oldData) => {
      const newVideo = {
        ...response.serverData.video,
        views: 0,
        isProcessing: true,
        isPrivate: false,
        fileSizeBytes: video.file.size,
        triggerAccessToken: response.serverData.triggerAccessToken,
        // biome-ignore lint/suspicious/noExplicitAny: temp
      } as any;

      const videos = [newVideo, ...(oldData?.videos ?? [])];

      videos.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return {
        ...oldData,
        videos,
      };
    });
  } catch (error) {
    if (error instanceof UploadAbortedError) {
      return;
    }

    if (error instanceof UploadingError || error instanceof UploadThingError) {
      toast.error("Failed to upload video", { description: error.message });
    } else {
      toast.error("Failed to upload video", { description: video.title });
    }

    queryClient.setQueryData(usageDataQueryOptions.queryKey, (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        totalStorageUsed: oldData.totalStorageUsed - video.file.size,
      };
    });
  } finally {
    useUploadingVideosStore.getState().removeVideo(video.id);
  }
}
