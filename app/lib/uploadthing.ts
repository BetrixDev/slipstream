import { genUploader } from "uploadthing/client";

import type { UploadRouter } from "../server/uploadthing";

const url = `${typeof window !== "undefined" ? window.origin : ""}/api/upload`;

export const { uploadFiles } = genUploader<UploadRouter>({
  url,
});
