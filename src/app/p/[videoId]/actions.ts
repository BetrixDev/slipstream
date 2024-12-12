"use server";

import { Redis } from "@upstash/redis";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { createVerifier } from "fast-jwt";

dayjs.extend(utc);

const redis = new Redis({
  url: process.env.REDIS_REST_URL,
  token: process.env.REDIS_REST_TOKEN,
});

export async function incrementViewCount(token: string) {
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
}
