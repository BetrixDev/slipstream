import { getAuth } from "@clerk/tanstack-start/server";
import { createServerFn } from "@tanstack/start";
import { getWebRequest } from "@tanstack/start/server";

export const fetchClerkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const { userId } = await getAuth(getWebRequest()!);

  return {
    userId,
  };
});
