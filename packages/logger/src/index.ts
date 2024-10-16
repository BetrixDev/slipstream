import { pino, type Logger } from "pino";
import { hostname } from "os";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

export function createLogger(service: string): Logger {
  const logger = pino({
    level: "debug",
    base: { pid: process.pid, hostname, service, timestamp: dayjs().utc().valueOf() },
    transport: {
      targets: [
        {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
          level: "debug",
        },
        {
          target: "@axiomhq/pino",
          options: {
            dataset: process.env.AXIOM_DATASET,
            token: process.env.AXIOM_TOKEN,
          },
          level: "debug",
        },
      ],
    },
  });

  process.on("beforeExit", (code) => {
    logger.flush();
    process.exit(code);
  });

  return logger;
}
