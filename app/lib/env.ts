import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    CLERK_SECRET_KEY: z.string(),
    CLERK_WEBHOOK_SECRET: z.string(),
    DATABASE_URL: z.string(),
    THUMBNAIL_BASE_URL: z.string(),
    VIDEOS_BUCKET_NAME: z.string(),
    THUMBS_BUCKET_NAME: z.string(),
    S3_READ_ONLY_ACCESS_KEY: z.string(),
    S3_READ_ONLY_SECRET_KEY: z.string(),
    S3_ENDPOINT: z.string(),
    S3_REGION: z.string(),
    S3_ROOT_ACCESS_KEY: z.string(),
    S3_ROOT_SECRET_KEY: z.string(),
    REDIS_REST_URL: z.string(),
    REDIS_REST_TOKEN: z.string(),
    TRIGGER_SECRET_KEY: z.string(),
    TOKEN_SIGNING_SECRET: z.string(),
    UPLOADTHING_TOKEN: z.string(),
    UPLOADTHING_APP_ID: z.string(),
    POLAR_ACCESS_TOKEN: z.string(),
    POLAR_WEBHOOK_SECRET: z.string(),
  },
  clientPrefix: "VITE_",
  client: {},
  skipValidation: process.env.NODE_ENV === undefined,
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
