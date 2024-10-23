import { env } from "env/views";
import { createVerifier } from "fast-jwt";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { Redis } from "ioredis";

dayjs.extend(utc);

const redis = new Redis({
  host: env.REDIS_HOST,
  port: Number(env.REDIS_PORT),
  password: env.REDIS_PASSWORD,
});

export default defineEventHandler(async (event) => {
  const token = event.headers.get("Authorization")?.split(" ")?.at(1);

  if (!token) {
    throw createError({
      status: 401,
      statusMessage: "Unauthorized",
      message: "Invalid token provided.",
      data: { success: false },
    });
  }

  let tokenPayload:
    | undefined
    | { iat: number; videoId: string; identifier: string; videoDuration: number } = undefined;

  try {
    const tokenVerifier = createVerifier({
      key: env.JWT_SIGNING_SECRET,
      cache: false,
      clockTimestamp: dayjs().utc().valueOf(),
    });

    tokenPayload = tokenVerifier(token);
  } catch (e: any) {
    console.error(e);

    throw createError({
      status: 401,
      statusMessage: "Bad token",
      data: { success: false },
    });
  }

  if (!tokenPayload) {
    throw createError({
      status: 401,
      statusMessage: "Bad token",
      data: { success: false },
    });
  }

  const utcTimestamp = Math.round(dayjs.utc().valueOf() / 1000);

  if (tokenPayload.iat + tokenPayload.videoDuration / 2 > utcTimestamp) {
    await redis.set(
      `rateLimit:${tokenPayload.identifier}`,
      1,
      "EX",
      Math.ceil(tokenPayload.videoDuration),
    );

    throw createError({
      status: 412,
      statusMessage: "Token not valid yet",
      data: { success: false },
    });
  }

  const rateLimitKey = `rateLimit:${tokenPayload.identifier}`;
  const userHasRateLimitActive = await redis.get(rateLimitKey);

  if (userHasRateLimitActive !== null) {
    throw createError({
      status: 429,
      statusMessage: "Too many requests",
      data: { success: false },
    });
  }

  const viewsKey = `views:${tokenPayload.videoId}`;

  const existingEntry = await redis.hget(viewsKey, "views");

  if (existingEntry) {
    await redis.hincrby(viewsKey, "views", 1);
  } else {
    await redis.hset(viewsKey, { views: 1, createdAt: utcTimestamp });
    await redis.zadd("views", utcTimestamp, viewsKey);
  }

  await redis.set(rateLimitKey, 1, "EX", Math.ceil(tokenPayload.videoDuration / 2));

  return { success: true };
});
