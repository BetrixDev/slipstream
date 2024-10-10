import { z } from "zod";

const transcoderEnvSchema = z.object({
  QUEUE_REDIS_HOST: z.string(),
  QUEUE_REDIS_PORT: z.string(),
  QUEUE_REDIS_PASSWORD: z.string(),
  CACHE_REDIS_HOST: z.string(),
  CACHE_REDIS_PORT: z.string(),
  CACHE_REDIS_PASSWORD: z.string(),
  DATABASE_URL: z.string(),
  DATABASE_AUTH_TOKEN: z.string(),
  API_SECRET: z.string(),
  API_PORT: z.string(),
  API_HOST: z.string(),
  API_PROTOCOL: z.string(),
  JWT_SIGNING_SECRET: z.string(),
  AXIOM_TOKEN: z.string(),
  AXIOM_DATASET: z.string(),
});

export const env = transcoderEnvSchema.parse(process.env);
