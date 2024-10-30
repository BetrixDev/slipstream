import { Worker } from "bullmq";
import { env } from "./env.js";
import { logger } from "./log.js";
import { pathToFileURL } from "url";
import path from "path";

const processorUrl = pathToFileURL(path.join(__dirname, "processor.js"));

export const transcoderWorker = new Worker<{ videoId: string; nativeFileKey: string }>(
  "{video-deletion}",
  processorUrl,
  {
    connection: {
      host: env.REDIS_HOST,
      port: Number(env.REDIS_PORT),
      password: env.REDIS_PASSWORD,
    },
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
