import { z } from "zod";

const transcoderEnvSchema = z.object({
  QUEUE_REDIS_HOST: z.string(),
  QUEUE_REDIS_PORT: z.string(),
  QUEUE_REDIS_PASSWORD: z.string(),
  S3_ROOT_ACCESS_KEY: z.string(),
  S3_ROOT_SECRET_KEY: z.string(),
  S3_VIDEOS_BUCKET: z.string(),
  S3_VIDEOS_REGION: z.string(),
  S3_ENDPOINT: z.string(),
  DATABASE_URL: z.string(),
  API_SECRET: z.string(),
  UPLOADTHING_TOKEN: z.string(),
  PORT: z.string(),
  HOST: z.string(),
  AXIOM_TOKEN: z.string(),
  AXIOM_DATASET: z.string(),
  THUMBS_BUCKET_ID: z.string(),
  VIDEOS_BUCKET_ID: z.string(),
  B2_THUMBS_WRITE_APP_KEY_ID: z.string(),
  B2_THUMBS_WRITE_APP_KEY: z.string(),
  B2_VIDEOS_READ_APP_KEY_ID: z.string(),
  B2_VIDEOS_READ_APP_KEY: z.string(),
  B2_VIDEOS_WRITE_APP_KEY_ID: z.string(),
  B2_VIDEOS_WRITE_APP_KEY: z.string(),
});

export const env = transcoderEnvSchema.parse(process.env);
