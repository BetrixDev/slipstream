import { env } from "~/server/env";
import { Redis } from "ioredis";

const USER_VIDEO_DAILY_LIMIT: Record<string, number> = {
  free: 3,
  pro: 12,
};

const redis = new Redis(env.REDIS_URL, { tls: {} });

export async function incrementUserUploadRateLimit(accountTier: string, userId: string) {
  if (accountTier === "premium" || accountTier === "ultimate") {
    return true;
  }

  const userDailyLimit = USER_VIDEO_DAILY_LIMIT[accountTier] ?? 3;

  const rateLimitKey = `uploadLimit:${userId}`;

  const currentLimitString = await redis.get(rateLimitKey);
  const currentLimit = parseInt(currentLimitString ?? "0");

  if (currentLimit >= userDailyLimit) {
    return false;
  }

  if (currentLimitString === null) {
    await redis.set(rateLimitKey, "1", "EX", 60 * 60 * 24);
  } else {
    await redis.incr(rateLimitKey);
  }

  return true;
}
