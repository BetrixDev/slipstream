import { create } from "zustand";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { queryClient } from "./root";
import axios from "axios";
import { SerializeFrom } from "@vercel/remix";
import { VideoBoardProps } from "./components/videos-board";

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
  addVideo: (video: Omit<UploadingVideo, "uploadProgress" | "videoSizeBytes" | "id">) => void;
  removeVideo: (id: string) => void;
  setUploadProgress: (id: string, progress: number) => void;
};

export const useUploadingVideosStore = create<UploadingVideosState & UploadingVideosActions>(
  (set) => ({
    uploadingVideos: [],
    addVideo: (video) =>
      set((state) => ({
        uploadingVideos: [
          {
            ...video,
            uploadProgress: 0,
            videoSizeBytes: video.file.size,
            id: nanoid(10),
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
          video.id === id ? { ...video, uploadProgress: progress } : video,
        ),
      })),
  }),
);

const uploadingVideosAbortControllers = new Map<string, AbortController>();

useUploadingVideosStore.subscribe((state, oldState) => {
  const newVideos = state.uploadingVideos.filter(
    (n) => oldState.uploadingVideos.find((o) => o.id === n.id) === undefined,
  );

  const removedVideos = oldState.uploadingVideos.filter(
    (o) => state.uploadingVideos.find((n) => n.id === o.id) === undefined,
  );

  newVideos.forEach((video) => {
    handleVideoUpload(video);
  });

  removedVideos.forEach((video) => {
    const abortController = uploadingVideosAbortControllers.get(video.id);

    if (abortController !== undefined) {
      abortController.abort();
      uploadingVideosAbortControllers.delete(video.id);
    }
  });
});

async function handleVideoUpload(video: UploadingVideo) {
  const abortController = new AbortController();

  uploadingVideosAbortControllers.set(video.id, abortController);

  try {
    const presigned = await axios<SerializeFrom<typeof import("~/routes/api.beginUpload").action>>(
      "/api/beginUpload",
      {
        method: "POST",
        data: {
          contentLength: video.file.size,
        },
        signal: abortController.signal,
      },
    );

    if (!presigned.data?.url) {
      throw new Error("Malformed response data");
    }

    queryClient.setQueryData<number>(["totalStorageUsed"], (prev) => (prev ?? 0) + video.file.size);

    await axios(presigned.data.url!, {
      onUploadProgress: (e) => {
        useUploadingVideosStore.getState().setUploadProgress(video.id, (e.progress ?? 0) * 100);
      },
      data: video.file,
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      signal: abortController.signal,
    });

    const { data: uploadCompleteData } = await axios<
      | { success: false }
      | {
          success: true;
          video: {
            id: string;
            title: string;
            fileSizeBytes: number;
            createdAt: number;
          };
        }
    >("/api/uploadComplete", {
      method: "POST",
      data: {
        key: presigned.data.key,
        title: video.title,
      },
      signal: abortController.signal,
    });

    if (!uploadCompleteData.success) {
      throw new Error("Upload failed");
    }

    queryClient.setQueryData<VideoBoardProps["videos"]>(["videos"], (prev) => {
      const videos = [
        { ...uploadCompleteData.video, views: 0, isProcessing: true, isPrivate: false },
        ...(prev ?? ([] as any)),
      ];

      videos.sort((a, b) => b.createdAt - a.createdAt);

      return videos;
    });
  } catch (error) {
    console.log("Error", error);
    toast.error(`Failed to upload video ${video.title}`);

    queryClient.setQueryData<number>(["totalStorageUsed"], (prev) => (prev ?? 0) - video.file.size);
  } finally {
    useUploadingVideosStore.getState().removeVideo(video.id);
  }
}
