import { db } from "../../../app/lib/db";
import { videos } from "../../../app/lib/schema";
import { logger, schedules } from "@trigger.dev/sdk/v3";
import { Redis } from "@upstash/redis";
import { eq, sql } from "drizzle-orm";

const BATCH_SIZE = 15;

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
          count: BATCH_SIZE,
          source: "redis",
        });

        const keys = (await redis.zrange(
          "views",
          0,
          BATCH_SIZE - 1
        )) as string[];

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

      await logger.trace(
        "Batch update video views in postgres",
        async (span) => {
          const updates = oldestEntries
            .filter((entry) => entry.value !== null)
            .map((entry) => ({
              videoId: entry.videoId,
              views: entry.value as number,
            }));

          span.setAttributes({
            updateCount: updates.length,
          });

          if (updates.length > 0) {
            await db.execute(sql`
              UPDATE ${videos}
              SET views = CASE id
                ${sql.join(
                  updates.map(
                    (update) =>
                      sql`WHEN ${update.videoId} THEN views + ${update.views}`
                  ),
                  " "
                )}
              END
              WHERE id IN (${sql.join(
                updates.map((update) => update.videoId),
                ", "
              )})
            `);
          }
          span.end();
        }
      );

      await redis.del(entry.key);
      await redis.zrem("views", entry.key);
      await redis.del(`video:${entry.videoId}`);
    }

    return { success: true };
  },
});
