import { Worker } from "bullmq";
import { logger } from "./log.js";
import path from "path";
import { env } from "./env.js";
import { pathToFileURL } from "url";

const processorUrl = pathToFileURL(path.join(import.meta.dirname, "processor.js"));

export const thumbnailWorker = new Worker<{ videoId: string }>("{thumbnail}", processorUrl, {
  connection: {
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    password: env.REDIS_PASSWORD,
  },
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
