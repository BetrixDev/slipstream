import { db } from "db";
import { env } from "env/web";
import { Redis } from "ioredis";

const USER_VIDEO_DAILY_LIMIT = {
  free: 3,
  pro: 12,
};

const redis = new Redis({
  host: env.REDIS_HOST,
  port: Number(env.REDIS_PORT),
  password: env.REDIS_PASSWORD,
});

export async function incrementUserUploadRateLimit(userId: string) {
  const userData = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
    columns: {
      accountTier: true,
    },
  });

  if (!userData) {
    return false;
  }

  if (userData.accountTier === "premium" || userData.accountTier === "ultimate") {
    return true;
  }

  const userDailyLimit = USER_VIDEO_DAILY_LIMIT[userData.accountTier] ?? 3;

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
