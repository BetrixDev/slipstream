import { create } from "zustand";

type DialogsStore = {
  isUploadVideoDialogOpen: boolean;
  isUploadVideoDialogData?: {
    videoFile: File;
    videoTitle: string;
  };
  isDeleteVideoDialogOpen: boolean;
  deleteVideoDialogData?: {
    videoId: string;
    videoTitle: string;
    contentLength: number;
  };
  isEditVideoDialogOpen: boolean;
  editVideoDialogData?: {
    videoId: string;
    videoTitle: string;
  };
  isTrimVideoDialogOpen: boolean;
  trimVideoDialogData?: {
    videoFile: File;
    videoTitle: string;
  };
  openUploadVideoDialog: (videoFile?: File, videoTitle?: string) => void;
  openDeleteVideoDialog: (
    videoId: string,
    videoTitle: string,
    contentLength: number
  ) => void;
  openEditVideoDialog: (videoId: string, videoTitle: string) => void;
  openTrimVideoDialog: (videoFile: File, videoTitle: string) => void;
  closeUploadVideoDialog: () => void;
  closeDeleteVideoDialog: () => void;
  closeEditVideoDialog: () => void;
  closeTrimVideoDialog: () => void;
};

export const useDialogsStore = create<DialogsStore>()((set) => ({
  isUploadVideoDialogOpen: false,
  isDeleteVideoDialogOpen: false,
  isEditVideoDialogOpen: false,
  isTrimVideoDialogOpen: false,
  openUploadVideoDialog: (videoFile, videoTitle) =>
    set({
      isUploadVideoDialogOpen: true,
      ...(videoFile && videoTitle
        ? {
            isUploadVideoDialogData: { videoFile, videoTitle },
          }
        : {}),
    }),
  openDeleteVideoDialog: (videoId, videoTitle, contentLength) =>
    set({
      isDeleteVideoDialogOpen: true,
      deleteVideoDialogData: { videoId, videoTitle, contentLength },
    }),
  openEditVideoDialog: (videoId, videoTitle) =>
    set({
      isEditVideoDialogOpen: true,
      editVideoDialogData: { videoId, videoTitle },
    }),
  openTrimVideoDialog: (videoFile, videoTitle) =>
    set({
      isTrimVideoDialogOpen: true,
      trimVideoDialogData: { videoFile, videoTitle },
    }),
  closeUploadVideoDialog: () => set({ isUploadVideoDialogOpen: false }),
  closeDeleteVideoDialog: () =>
    set({ isDeleteVideoDialogOpen: false, deleteVideoDialogData: undefined }),
  closeEditVideoDialog: () =>
    set({ isEditVideoDialogOpen: false, editVideoDialogData: undefined }),
  closeTrimVideoDialog: () =>
    set({ isTrimVideoDialogOpen: false, trimVideoDialogData: undefined }),
}));
