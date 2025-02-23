import { db } from "../../../app/lib/db";
import { videos } from "../../../app/lib/schema";
import { logger, schedules } from "@trigger.dev/sdk/v3";
import { Redis } from "@upstash/redis";
import { eq, sql } from "drizzle-orm";

export const incrementViewsScheduledTask = schedules.task({
  id: "increment-views",
  cron: "*/5 * * * *",
  run: async () => {
    const { env } = await import("../../../app/lib/env");

    const redis = new Redis({
      token: env.REDIS_REST_TOKEN,
      url: env.REDIS_REST_URL,
      enableAutoPipelining: true,
    });

    const oldestKeys = await logger.trace(
      "Get oldest view keys",
      async (span) => {
        span.setAttributes({
          count: 15,
          source: "redis",
        });

        const keys = (await redis.zrange("views", 0, 14)) as string[];

        span.end();
        return keys;
      }
    );

    const oldestEntries = await logger.trace(
      "Get oldest entries views",
      async (span) => {
        span.setAttributes({
          keyCount: oldestKeys.length,
          source: "redis",
        });

        const entries = await Promise.all(
          oldestKeys.map(async (key) => {
            return {
              key,
              videoId: key.split(":")[1],
              value: await redis.hget(key, "views"),
            };
          })
        );

        span.end();
        return entries;
      }
    );

    for (const entry of oldestEntries) {
      if (entry.value === null) {
        continue;
      }

      // TODO: Use a CASE statement so we can update all records in 1 call

      await logger.trace("Update video views in postgres", async (span) => {
        span.setAttributes({
          videoId: entry.videoId,
          viewsToAdd: entry.value as number,
        });

        await db
          .update(videos)
          .set({ views: sql`${videos.views} + ${entry.value}` })
          .where(eq(videos.id, entry.videoId));

        span.end();
      });

      await redis.del(entry.key);
      await redis.zrem("views", entry.key);
      await redis.del(`video:${entry.videoId}`);
    }

    return { success: true };
  },
});
