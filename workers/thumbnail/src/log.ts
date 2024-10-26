import { createLogger } from "logger";
import { type Logger } from "winston";

export const logger: Logger = createLogger("worker-thumbnail");
