import { atom } from "jotai";

export const deleteVideoAtom = atom<
  { id: string; name: string; contentLength: number } | undefined
>();

export const editVideoAtom = atom<{ id: string; name: string } | undefined>();

export const isUploadDialogOpenAtom = atom(false);
