import TopNav from "@/components/top-nav";
import { DeleteVideoDialog } from "./components/dialogs/delete-video-dialog";
import { UploadVideoDialog } from "./components/dialogs/upload-video-dialog";
import { EditVideoDialog } from "./components/dialogs/edit-video-dialog";
import { TrimVideoDialog } from "./components/dialogs/trim-video-dialog";
import { FullPageDropzone } from "./components/full-page-dropzone";
import { Server } from "./components/server";
import { Suspense } from "react";

export const experimental_ppr = true;

export default async function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Suspense>
        <TopNav />
      </Suspense>
      <EditVideoDialog />
      <DeleteVideoDialog />
      <UploadVideoDialog />
      <TrimVideoDialog />
      <FullPageDropzone />
      <Suspense>
        <Server />
      </Suspense>
    </div>
  );
}
