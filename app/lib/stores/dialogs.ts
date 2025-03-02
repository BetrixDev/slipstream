import { create } from "zustand";

type DialogsStore = {
  isUploadVideoDialogOpen: boolean;
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
  openUploadVideoDialog: () => void;
  openDeleteVideoDialog: (
    videoId: string,
    videoTitle: string,
    contentLength: number
  ) => void;
  openEditVideoDialog: (videoId: string, videoTitle: string) => void;
  closeUploadVideoDialog: () => void;
  closeDeleteVideoDialog: () => void;
  closeEditVideoDialog: () => void;
};

export const useDialogsStore = create<DialogsStore>()((set) => ({
  isUploadVideoDialogOpen: false,
  isDeleteVideoDialogOpen: false,
  isEditVideoDialogOpen: false,
  openUploadVideoDialog: () =>
    set({
      isUploadVideoDialogOpen: true,
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
  closeUploadVideoDialog: () => set({ isUploadVideoDialogOpen: false }),
  closeDeleteVideoDialog: () =>
    set({ isDeleteVideoDialogOpen: false, deleteVideoDialogData: undefined }),
  closeEditVideoDialog: () =>
    set({ isEditVideoDialogOpen: false, editVideoDialogData: undefined }),
}));
