import { z } from "zod";
import { baseWorkerSchema } from "./base.js";

const videoDeletionWorkerSchema = baseWorkerSchema.extend({
  S3_ROOT_ACCESS_KEY: z.string(),
  S3_ROOT_SECRET_KEY: z.string(),
  S3_VIDEOS_ENDPOINT: z.string(),
  S3_VIDEOS_REGION: z.string(),
  S3_THUMBS_ENDPOINT: z.string(),
  S3_THUMBS_REGION: z.string(),
  S3_THUMBS_BUCKET: z.string(),
  S3_VIDEOS_BUCKET: z.string(),
  DATABASE_URL: z.string(),
});

export const env = videoDeletionWorkerSchema.parse(process.env);
