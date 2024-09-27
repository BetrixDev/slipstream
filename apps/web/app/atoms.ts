import { atom } from "jotai";

export const deleteVideoAtom = atom<{ id: string; name: string } | undefined>();

export const editVideoAtom = atom<{ id: string; name: string } | undefined>();
