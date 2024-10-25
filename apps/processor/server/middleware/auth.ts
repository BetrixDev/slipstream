import { env } from "env/processor";

export default defineEventHandler((event) => {
  if (getRequestURL(event).pathname.startsWith("/api")) {
    const token = getRequestHeader(event, "Authorization")?.split(" ")?.at(1);

    if (!token || token !== env.API_SECRET) {
      throw createError({
        status: 403,
        message: "Forbidden",
      });
    }
  }
});
