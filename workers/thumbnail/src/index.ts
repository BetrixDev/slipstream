import { Worker } from "bullmq";
import { logger } from "./log.js";
import path from "path";
import { env } from "./env.js";
import { pathToFileURL } from "url";
import { Redis } from "ioredis";
import { createServer } from "http";

createServer((_, res) => {
  res.writeHead(200);
  res.end();
}).listen(env.PORT, () => {
  logger.info(`Thumbnail worker health check listening on port ${env.PORT}`);
});

const processorUrl = pathToFileURL(path.join(import.meta.dirname, "processor.js"));

export const thumbnailWorker = new Worker<{ videoId: string }>("{thumbnail}", processorUrl, {
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
