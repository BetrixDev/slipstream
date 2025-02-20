import { getAuth } from "@clerk/tanstack-start/server";
import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/start";
import { getWebRequest } from "@tanstack/start/server";

export const authGuardMiddleware = createMiddleware().server(
  async ({ next }) => {
    const webRequest = getWebRequest();

    if (!webRequest) {
      throw redirect({ to: "/sign-in/$" });
    }

    const { userId } = await getAuth(webRequest);

    if (!userId) {
      throw redirect({ to: "/sign-in/$" });
    }

    return next({
      context: {
        userId,
      },
    });
  }
);
