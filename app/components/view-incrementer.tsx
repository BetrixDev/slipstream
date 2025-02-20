import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/start";
import { Redis } from "@upstash/redis";
import dayjs from "dayjs";
import { createVerifier } from "fast-jwt";
import { useEffect } from "react";
import { z } from "zod";
import { viewTokenQueryOptions } from "../lib/query-utils";

type ViewIncrementerProps = {
  videoId: string;
  videoDuration: number;
};

export function ViewIncrementer({
  videoId,
  videoDuration,
}: ViewIncrementerProps) {
  const { data } = useQuery(viewTokenQueryOptions(videoId, videoDuration));

  // biome-ignore lint/correctness/useExhaustiveDependencies: not needed
  useEffect(() => {
    const token = data?.token;

    if (!token) {
      return;
    }

    const timeout = setTimeout(() => {
      incrementViewCount({ data: { token } });
    }, (videoDuration / 2) * 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [data]);

  return null;
}

const incrementViewCount = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data: { token } }) => {
    const redis = new Redis({
      url: process.env.REDIS_REST_URL,
      token: process.env.REDIS_REST_TOKEN,
    });

    let tokenPayload:
      | undefined
      | {
          iat: number;
          videoId: string;
          identifier: string;
          videoDuration: number;
        };

    try {
      const tokenVerifier = createVerifier({
        key: process.env.TOKEN_SIGNING_SECRET,
        cache: false,
        clockTimestamp: dayjs().utc().valueOf(),
      });

      tokenPayload = tokenVerifier(token);
    } catch (error) {
      console.log(error);

      return {
        success: false,
        error: "Invalid token",
      };
    }

    if (!tokenPayload) {
      return {
        success: false,
        error: "Invalid token",
      };
    }

    const utcTimestamp = Math.round(dayjs.utc().valueOf() / 1000);

    const rateLimitKey = `rateLimit:${tokenPayload.identifier}`;

    if (tokenPayload.iat + tokenPayload.videoDuration / 2 > utcTimestamp) {
      await redis.set(rateLimitKey, 1, {
        ex: tokenPayload.videoDuration,
      });

      return {
        success: false,
        error: "Token not valid yet",
      };
    }

    const userHasRateLimitActive = await redis.get(rateLimitKey);

    if (userHasRateLimitActive !== null) {
      return {
        success: false,
        error: "Too many requests",
      };
    }

    const viewsKey = `views:${tokenPayload.videoId}`;

    const existingEntry = await redis.hget(viewsKey, "views");

    if (existingEntry) {
      await redis.hincrby(viewsKey, "views", 1);
    } else {
      await redis.hset(viewsKey, { views: 1, createdAt: utcTimestamp });
      await redis.zadd("views", { score: utcTimestamp, member: viewsKey });
    }

    await redis.set(rateLimitKey, 1, {
      ex: Math.ceil(tokenPayload.videoDuration / 2),
    });

    return {
      success: true,
    };
  });
