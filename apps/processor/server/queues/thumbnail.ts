import { Queue } from "bullmq";
import { env } from "env/processor";

export const thumbnailQueue = new Queue("{thumbnail}", {
  connection: {
    host: env.QUEUE_REDIS_HOST,
    port: Number(env.QUEUE_REDIS_PORT),
    password: env.QUEUE_REDIS_PASSWORD,
  },
});
