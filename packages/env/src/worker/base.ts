import { z } from "zod";

export const baseWorkerSchema = z.object({
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string(),
  REDIS_PASSWORD: z.string(),
  AXIOM_DATASET: z.string(),
  AXIOM_TOKEN: z.string(),
});

export const env = baseWorkerSchema.parse(process.env);
