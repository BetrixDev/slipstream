import { z } from "zod";

const transcodingWorkerSchema = z.object({
  REDIS_URL: z.string(),
  AXIOM_DATASET: z.string(),
  AXIOM_TOKEN: z.string(),
  B2_VIDEOS_READ_APP_KEY_ID: z.string(),
  B2_VIDEOS_READ_APP_KEY: z.string(),
  B2_VIDEOS_WRITE_APP_KEY_ID: z.string(),
  B2_VIDEOS_WRITE_APP_KEY: z.string(),
  B2_THUMBS_WRITE_APP_KEY_ID: z.string(),
  B2_THUMBS_WRITE_APP_KEY: z.string(),
  VIDEOS_BUCKET_ID: z.string(),
  DATABASE_URL: z.string(),
});

export const env = transcodingWorkerSchema.parse(process.env);
