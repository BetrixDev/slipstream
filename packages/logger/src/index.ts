import winston from "winston";
import os from "node:os";
import { WinstonTransport as AxiomTransport } from "@axiomhq/winston";

if (!process.env.AXIOM_TOKEN) {
  throw new Error("AXIOM_TOKEN not set in environment");
}

export function createLogger(serviceName: string) {
  const logger = winston.createLogger({
    level: process.env.NODE_ENV !== "production" ? "debug" : "info",
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    defaultMeta: { hostname: os.hostname(), service: serviceName },
    transports: [
      new AxiomTransport({
        dataset: process.env.AXIOM_DATASET,
        token: process.env.AXIOM_TOKEN!,
      }),
    ],
  });

  if (process.env.NODE_ENV !== "production") {
    logger.add(
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      }),
    );
  }

  return logger;
}
