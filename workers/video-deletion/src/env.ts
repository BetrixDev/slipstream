import { z } from "zod";

const videoDeletionWorkerSchema = z.object({
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string(),
  REDIS_PASSWORD: z.string(),
  AXIOM_DATASET: z.string(),
  AXIOM_TOKEN: z.string(),
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
