import { logger } from "~/utils/logger";

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook("error", async (error, { event }) => {
    logger.error(`Application error occured for path ${event.path}`, {
      ...error,
      path: event.path,
    });
  });

  nitro.hooks.hook("request", (event) => {
    logger.info(`--> ${event.method} ${event.path}`, {
      path: event.path,
      method: event.method,
    });
  });

  nitro.hooks.hook("afterResponse", (event, { body }) => {
    logger.info(`<-- ${event.method} ${event.path} ${body}`);
  });
});
