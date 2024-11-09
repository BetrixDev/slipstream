import { z } from "zod";

const thumbnailWorkerSchema = z.object({
  S3_ENDPOINT: z.string(),
  S3_REGION: z.string(),
  S3_ROOT_ACCESS_KEY: z.string(),
  S3_ROOT_SECRET_KEY: z.string(),
  VIDEOS_BUCKET_NAME: z.string(),
  THUMBS_BUCKET_NAME: z.string(),
  DATABASE_URL: z.string(),
});

export const env = thumbnailWorkerSchema.parse(process.env);
