import { z } from "zod";

const transcoderEnvSchema = z.object({
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string(),
  REDIS_PASSWORD: z.string(),
  DATABASE_URL: z.string(),
  API_SECRET: z.string(),
  PORT: z.string(),
  JWT_SIGNING_SECRET: z.string(),
  AXIOM_TOKEN: z.string(),
  AXIOM_DATASET: z.string(),
});

export const env = transcoderEnvSchema.parse(process.env);
