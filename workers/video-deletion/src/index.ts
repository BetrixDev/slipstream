import { Worker } from "bullmq";
import { env } from "./env.js";
import { logger } from "./log.js";
import { Redis } from "ioredis";
import { processor } from "./processor.js";

export const transcoderWorker = new Worker<{ videoId: string; nativeFileKey: string }>(
  "{video-deletion}",
  processor,
  {
    connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
    concurrency: 5,
    removeOnComplete: { count: 0 },
    removeOnFail: { count: 0 },
  },
);

logger.info("Video deletion worker started successfully");

transcoderWorker.on("failed", async (job, err) => {
  logger.error("Video deletion job failed", {
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

transcoderWorker.on("completed", (job, result) => {
  logger.info("Video deletion job completed", {
    jobQueue: job.queueName,
    jobId: job?.id,
    name: job?.name,
    jobData: job?.data,
    result,
  });
});
