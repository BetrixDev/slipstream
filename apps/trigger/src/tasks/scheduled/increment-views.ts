import { schedules } from "@trigger.dev/sdk/v3";
import { Redis } from "@upstash/redis";
import { envSchema } from "../../utils/env.js";
import { db, eq, sql, videos } from "db";

export const incrementViewsScheduledTask = schedules.task({
  id: "increment-views",
  cron: "*/5 * * * *",
  run: async () => {
    const env = envSchema.parse(process.env);

    const redis = new Redis({
      token: env.REDIS_REST_TOKEN,
      url: env.REDIS_REST_URL,
      enableAutoPipelining: true,
    });

    const oldestKeys = (await redis.zrange("views", 0, 14)) as string[];

    const oldestEntries = await Promise.all(
      oldestKeys.map(async (key) => {
        return { key, videoId: key.split(":")[1], value: await redis.hget(key, "views") };
      }),
    );

    for (const entry of oldestEntries) {
      if (entry.value === null) {
        continue;
      }

      // TODO: Use a CASE statement so we can update all records in 1 call

      await db
        .update(videos)
        .set({ views: sql`${videos.views} + ${entry.value}` })
        .where(eq(videos.id, entry.videoId));

      await redis.del(entry.key);
      await redis.zrem("views", entry.key);
      await redis.del(`video:${entry.videoId}`);
    }

    return { success: true };
  },
});
