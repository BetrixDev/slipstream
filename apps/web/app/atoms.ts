import { atom } from "jotai";

export const deleteVideoAtom = atom<
  { id: string; name: string; contentLength: number } | undefined
>();

export const editVideoAtom = atom<{ id: string; name: string } | undefined>();

export const isUploadDialogOpenAtom = atom(false);

export const customFileToUploadAtom = atom<File | undefined>();

export const trimVideoDataAtom = atom<{ file: File; title?: string } | undefined>();
