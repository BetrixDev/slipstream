import { z } from "zod";

const cronEnvSchema = z.object({
  AXIOM_TOKEN: z.string(),
  AXIOM_DATASET: z.string(),
  DATABASE_URL: z.string(),
  API_SECRET: z.string(),
  PORT: z.string(),
  S3_VIDEOS_BUCKET: z.string(),
  S3_THUMBS_BUCKET: z.string(),
  S3_VIDEOS_ENDPOINT: z.string(),
  S3_VIDEOS_REGION: z.string(),
  S3_ROOT_ACCESS_KEY: z.string(),
  S3_ROOT_SECRET_KEY: z.string(),
  S3_THUMBS_ENDPOINT: z.string(),
  S3_THUMBS_REGION: z.string(),
});

export const env = cronEnvSchema.parse(process.env);
