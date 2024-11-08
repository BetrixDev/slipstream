import { Worker } from "bullmq";
import { logger } from "./log.js";
import { env } from "./env.js";
import { Redis } from "ioredis";
import { processor } from "processor.js";

const server = Bun.serve({
  port: env.PORT,
  static: {
    "/": new Response(undefined, { status: 200 }),
  },
  fetch() {
    return new Response("404!");
  },
});

logger.info(`Thumbnail worker health check listening on ${server.url}`);

export const thumbnailWorker = new Worker<{ videoId: string }>("{thumbnail}", processor, {
  connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
  concurrency: 3,
  removeOnComplete: { count: 0 },
  removeOnFail: { count: 0 },
});

logger.info("Thumbnail worker started successfully");

thumbnailWorker.on("failed", async (job, err) => {
  logger.error("Thumbnail job failed", {
    jobQueue: job?.queueName,
    jobId: job?.id,
    name: job?.name,
    jobData: job?.data,
    failedReason: job?.failedReason,
    stackTrace: job?.stacktrace,
    errorMessage: err.message,
    errorStack: err.stack,
    errorCause: err.cause,
  });
});

thumbnailWorker.on("completed", (job, result) => {
  logger.info("Thumbnail job completed", {
    jobQueue: job.queueName,
    jobId: job?.id,
    name: job?.name,
    jobData: job?.data,
    result,
  });
});
