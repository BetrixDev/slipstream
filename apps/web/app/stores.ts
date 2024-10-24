import { create } from "zustand";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { queryClient } from "./root";
import axios from "axios";
import { SerializeFrom } from "@vercel/remix";
import { VideoBoardProps } from "./components/videos-board";
import { notNanOrDefault } from "./lib/utils";

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
    const { data: uploadPreflight } = await axios<
      SerializeFrom<typeof import("~/routes/api.beginUpload").action>
    >("/api/beginUpload", {
      method: "POST",
      data: {
        contentLength: video.file.size,
      },
      signal: abortController.signal,
    });

    if (!uploadPreflight) {
      throw new Error("Malformed response data");
    }

    queryClient.setQueryData<number>(
      ["totalStorageUsed"],
      (prev) => notNanOrDefault(prev) + video.file.size,
    );

    await axios(uploadPreflight.url!, {
      onUploadProgress: (e) => {
        useUploadingVideosStore.getState().setUploadProgress(video.id, (e.progress ?? 0) * 100);
      },
      data: video.file,
      method: "POST",
      headers: {
        "Content-Type": "b2/x-auto",
        Authorization: uploadPreflight.token!,
        "X-Bz-File-Name": uploadPreflight.key!,
        "X-Bz-Content-Sha1": await computeSHA1Checksum(video.file),
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
        key: uploadPreflight.key,
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
    console.error("Error", error);
    toast.error("Failed to upload video", { description: video.title });

    queryClient.setQueryData<number>(["totalStorageUsed"], (prev) =>
      Math.max(notNanOrDefault(prev) - video.file.size, 0),
    );
  } finally {
    useUploadingVideosStore.getState().removeVideo(video.id);
  }
}

async function computeSHA1Checksum(file: File): Promise<string> {
  // Read the file as an ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Compute the SHA-1 hash
  const hashBuffer = await crypto.subtle.digest("SHA-1", arrayBuffer);

  // Convert the hash from ArrayBuffer to a hexadecimal string
  const hashArray = new Uint8Array(hashBuffer);
  const hashHex = Array.from(hashArray)
    .map((b) => ("00" + b.toString(16)).slice(-2))
    .join("");

  return hashHex;
}
