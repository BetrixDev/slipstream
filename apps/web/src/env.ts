import { z } from "zod";

const envSchema = z.object({
  S3_REGION: z.string(),
  S3_ENDPOINT: z.string(),
  S3_READ_ONLY_ACCESS_KEY: z.string(),
  S3_READ_ONLY_SECRET_KEY: z.string(),
  S3_ROOT_ACCESS_KEY: z.string(),
  S3_ROOT_SECRET_KEY: z.string(),
  VIDEOS_BUCKET_NAME: z.string(),
  THUMBS_BUCKET_NAME: z.string(),
  THUMBNAIL_BASE_URL: z.string(),
  REDIS_REST_URL: z.string(),
  REDIS_REST_TOKEN: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_SIGNING_SECRET: z.string(),
  PREMIUM_PRODUCT_ID: z.string(),
  PRO_PRODUCT_ID: z.string(),
});

export const env = envSchema.parse(process.env);
