import { z } from "zod";

const thumbnailWorkerSchema = z.object({
  REDIS_URL: z.string(),
  AXIOM_DATASET: z.string(),
  AXIOM_TOKEN: z.string(),
  VIDEOS_BUCKET_ID: z.string(),
  THUMBS_BUCKET_ID: z.string(),
  B2_VIDEOS_READ_APP_KEY_ID: z.string(),
  B2_VIDEOS_READ_APP_KEY: z.string(),
  B2_VIDEOS_WRITE_APP_KEY_ID: z.string(),
  B2_VIDEOS_WRITE_APP_KEY: z.string(),
  B2_THUMBS_WRITE_APP_KEY_ID: z.string(),
  B2_THUMBS_WRITE_APP_KEY: z.string(),
  DATABASE_URL: z.string(),
  PORT: z.coerce.number(),
});

export const env = thumbnailWorkerSchema.parse(process.env);
