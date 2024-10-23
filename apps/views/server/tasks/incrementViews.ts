import { db, eq, sql, videos } from "db";
import { env } from "env/views";
import { Redis } from "ioredis";

export default defineTask({
  meta: {
    name: "incrementViews",
    description: "Increments the views from the redis cache on a first in first out basis",
  },
  run: async () => {
    const redis = new Redis({
      host: env.REDIS_HOST,
      port: Number(env.REDIS_PORT),
      password: env.REDIS_PASSWORD,
    });

    const oldestKeys = await redis.zrange("views", 0, 9);

    const oldestEntries = await Promise.all(
      oldestKeys.map(async (key) => {
        return { key, videoId: key.split(":")[1], value: await redis.hget(key, "views") };
      }),
    );

    for (const entry of oldestEntries) {
      if (entry.value === null) {
        continue;
      }

      await db
        .update(videos)
        .set({ views: sql`${videos.views} + ${entry.value}` })
        .where(eq(videos.id, entry.videoId));

      await redis.del(entry.key);
      await redis.zrem("views", entry.key);
    }

    return { result: "Success" };
  },
});
