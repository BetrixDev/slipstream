import { create } from "zustand";

export type Video = {
  id: string;
  title: string;
  views: number;
  fileSizeBytes: number;
  smallThumbnailUrl?: string | null;
  triggerAccessToken?: string;
  videoLengthSeconds?: number | null;
  isProcessing: boolean;
  isPrivate: boolean;
  createdAt: string;
  deletionDate?: string | null;
};

type UserVideoDataState = {
  totalStorageAvailable: number;
  totalStorageUsed: number;
  maxFileUploadSize: number;
  videos: Video[];
};

type UserVideoDataActions = {
  incrementTotalStorageUsed: (amount: number) => void;
  decrementTotalStorageUsed: (amount: number) => void;
  setVideos: (videos: Video[]) => void;
};

export const useUserVideoDatastore = create<UserVideoDataState & UserVideoDataActions>()((set) => ({
  maxFileUploadSize: 0,
  totalStorageAvailable: 0,
  totalStorageUsed: 0,
  videos: [],
  incrementTotalStorageUsed: (amount) =>
    set((state) => ({ totalStorageUsed: state.totalStorageUsed + amount })),
  decrementTotalStorageUsed: (amount) =>
    set((state) => ({
      totalStorageUsed: Math.max(state.totalStorageUsed - amount, 0),
    })),
  setVideos: (videos) => set({ videos }),
}));
