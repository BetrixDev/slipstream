import axios, { CanceledError } from "axios";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { create } from "zustand";
import {
  uploadCompleteServerFn,
  getUploadPreflightDataServerFn,
} from "@/server-fns/videos";
import { type Video, useUserVideoDatastore } from "./user-video-data";

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

  try {
    const uploadPreflight = await getUploadPreflightDataServerFn({
      data: {
        contentLength: video.file.size,
        contentType: video.file.type,
      },
    });

    if (!uploadPreflight.success) {
      throw new UploadingError(uploadPreflight.message);
    }

    useUserVideoDatastore.getState().incrementTotalStorageUsed(video.file.size);

    await axios(uploadPreflight.url, {
      onUploadProgress: (e) => {
        useUploadingVideosStore
          .getState()
          .setUploadProgress(video.id, (e.progress ?? 0) * 100);
      },
      data: video.file,
      method: "PUT",
      headers: {
        "Content-Type": "application/octect-stream",
      },
      signal: abortController.signal,
    });

    const uploadCompleteData = await uploadCompleteServerFn({
      data: {
        key: uploadPreflight.key,
        title: video.title,
        mimeType: video.file.type,
      },
    });

    if (!uploadCompleteData.success) {
      throw new UploadingError(uploadCompleteData.message);
    }

    if (!uploadCompleteData.video) {
      return;
    }

    useUserVideoDatastore.setState((state) => {
      const newVideo: Video = {
        ...uploadCompleteData.video,
        views: 0,
        isProcessing: true,
        isPrivate: false,
        fileSizeBytes: video.file.size,
        triggerAccessToken: uploadCompleteData.triggerAccessToken,
      };

      const videos = [newVideo, ...state.videos];

      videos.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return {
        videos,
      };
    });
  } catch (error) {
    if (error instanceof CanceledError) {
      return;
    }

    if (error instanceof UploadingError) {
      toast.error("Failed to upload video", { description: error.message });
    } else {
      toast.error("Failed to upload video", { description: video.title });
    }

    useUserVideoDatastore.getState().decrementTotalStorageUsed(video.file.size);
  } finally {
    useUploadingVideosStore.getState().removeVideo(video.id);
  }
}
