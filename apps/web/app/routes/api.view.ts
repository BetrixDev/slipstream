import { ActionFunctionArgs, json } from "@vercel/remix";
import axios from "axios";
import { env } from "env/web";
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

export async function action({ request }: ActionFunctionArgs) {
  const token = request.headers.get("Authorization")?.split(" ")?.at(1);

  if (token === undefined) {
    return json({ success: false, message: "No token provided" }, { status: 401 });
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

    return json({ success: false, message: "Bad token" }, { status: 401 });
  }

  if (!tokenPayload) {
    return json({ success: false, message: "Bad token" }, { status: 401 });
  }

  const utcTimestamp = Math.round(dayjs.utc().valueOf() / 1000);

  if (tokenPayload.iat + tokenPayload.videoDuration / 2 > utcTimestamp) {
    await redis.set(
      `rateLimit:${tokenPayload.identifier}`,
      1,
      "EX",
      Math.ceil(tokenPayload.videoDuration),
    );

    return json(
      {
        success: false,
        message: "Token not valid yet",
      },
      { status: 412 },
    );
  }

  const rateLimitKey = `rateLimit:${tokenPayload.identifier}`;
  const userHasRateLimitActive = await redis.get(rateLimitKey);

  if (userHasRateLimitActive !== null) {
    return json({ success: false, statusMessage: "Too many requests" }, { status: 429 });
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

  return json({ sucess: true }, { status: 200 });
}
