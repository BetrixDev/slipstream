import { z } from "zod";

const transcoderEnvSchema = z.object({
  DATABASE_URL: z.string(),
});

export const env = transcoderEnvSchema.parse(process.env);
