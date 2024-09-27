import { z } from "zod";

const webEnvSchema = z.object({
  CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  CLERK_SIGN_IN_URL: z.string(),
  CLERK_SIGN_UP_URL: z.string(),
  CLERK_SIGN_IN_FALLBACK_URL: z.string(),
  CLERK_SIGN_UP_FALLBACK_URL: z.string(),
  DATABASE_URL: z.string(),
  DATABASE_AUTH_TOKEN: z.string(),
  CLERK_WEBHOOK_SECRET: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_SIGNING_SECRET: z.string(),
  S3_ROOT_ACCESS_KEY: z.string(),
  S3_ROOT_SECRET_KEY: z.string(),
  S3_READ_ONLY_ACCESS_KEY: z.string(),
  S3_READ_ONLY_SECRET_KEY: z.string(),
  S3_WRITE_ONLY_ACCESS_KEY: z.string(),
  S3_WRITE_ONLY_SECRET_KEY: z.string(),
  S3_VIDEOS_BUCKET: z.string(),
  S3_VIDEOS_REGION: z.string(),
  S3_VIDEOS_ENDPOINT: z.string(),
});

export const env = webEnvSchema.parse(process.env);
