import { z } from "zod";
import { baseWorkerSchema } from "./base.js";

const thumbnailWorkerSchema = baseWorkerSchema.extend({
  VIDEOS_BUCKET_ID: z.string(),
  THUMBS_BUCKET_ID: z.string(),
  B2_VIDEOS_READ_APP_KEY_ID: z.string(),
  B2_VIDEOS_READ_APP_KEY: z.string(),
  B2_VIDEOS_WRITE_APP_KEY_ID: z.string(),
  B2_VIDEOS_WRITE_APP_KEY: z.string(),
  B2_THUMBS_WRITE_APP_KEY_ID: z.string(),
  B2_THUMBS_WRITE_APP_KEY: z.string(),
  DATABASE_URL: z.string(),
});

export const env = thumbnailWorkerSchema.parse(process.env);
