import { z } from "zod";

export const envSchema = z.object({
  S3_ENDPOINT: z.string(),
  S3_REGION: z.string(),
  S3_ROOT_ACCESS_KEY: z.string(),
  S3_ROOT_SECRET_KEY: z.string(),
  VIDEOS_BUCKET_NAME: z.string(),
  THUMBS_BUCKET_NAME: z.string(),
  THUMBNAIL_BASE_URL: z.string(),
  DATABASE_URL: z.string(),
  REDIS_REST_URL: z.string(),
  REDIS_REST_TOKEN: z.string(),
});
