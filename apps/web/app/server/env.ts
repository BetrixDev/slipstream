/* eslint-disable @typescript-eslint/no-namespace */
import { z } from "zod";

const envSchema = z.object({
  CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  CLERK_SIGN_IN_URL: z.string(),
  CLERK_SIGN_UP_URL: z.string(),
  CLERK_SIGN_IN_FALLBACK_URL: z.string(),
  CLERK_WEBHOOK_SECRET: z.string(),
  CLERK_SIGN_UP_FALLBACK_URL: z.string(),
  DATABASE_URL: z.string(),
  DATABASE_AUTH_TOKEN: z.string(),
  S3_ROOT_ACCESS_KEY: z.string(),
  S3_ROOT_SECRET_KEY: z.string(),
  S3_READ_ACCESS_KEY: z.string(),
  S3_READ_SECRET_KEY: z.string(),
  S3_WRITE_ACCESS_KEY: z.string(),
  S3_WRITE_SECRET_KEY: z.string(),
  S3_VIDEOS_BUCKET: z.string(),
  S3_VIDEOS_REGION: z.string(),
  S3_VIDEOS_ENDPOINT: z.string(),
  S3_THUMBS_BUCKET: z.string(),
  S3_THUMBS_REGION: z.string(),
  S3_THUMBS_ENDPOINT: z.string(),
});

envSchema.parse(process.env);

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}
