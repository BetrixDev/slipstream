import { Queue, Worker } from "bullmq";
import { env } from "env/views";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { logger } from "hono/logger";
import { Redis } from "ioredis";
import { db, eq, sql, videos } from "db";
import { createVerifier } from "fast-jwt";
import { serve } from "@hono/node-server";
import dayjs from "dayjs";

const cacheRedis = new Redis({
  host: env.CACHE_REDIS_HOST,
  port: Number(env.CACHE_REDIS_PORT),
  password: env.CACHE_REDIS_PASSWORD,
});

const incrementViewsQueue = new Queue("{incrementViewsQueue}", {
  connection: {
    host: env.CACHE_REDIS_HOST,
    port: Number(env.CACHE_REDIS_PORT),
    password: env.CACHE_REDIS_PASSWORD,
  },
});

const incrementViewsWorker = new Worker(
  "{incrementViewsQueue}",
  async (job) => {
    const { videoId } = job.data;

    if (!videoId) {
      return;
    }

    const viewsToAdd = await cacheRedis.get(`views:${videoId}`);

    if (!viewsToAdd) {
      return;
    }

    const result = await db
      .update(videos)
      .set({ views: sql`${videos.views} + ${viewsToAdd}` })
      .where(eq(videos.id, videoId));

    if (result.rowsAffected < 0) {
      throw new Error(`Unknown error when attempting to set views for ${videoId} to database`);
    }

    await cacheRedis.del(`views:${videoId}`);
  },
  {
    connection: {
      host: env.CACHE_REDIS_HOST,
      port: Number(env.CACHE_REDIS_PORT),
      password: env.CACHE_REDIS_PASSWORD,
    },
    concurrency: 2,
  },
);

incrementViewsWorker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

incrementViewsWorker.on("failed", (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});

const api = new Hono();

api.use(logger());
api.use("/api/*", bearerAuth({ token: env.API_SECRET }));

api.get("/hc", (c) => c.text("Views service is running"));

api.put("/api/incrementViews", async (c) => {
  const token = await c.req.text();

  let tokenPayload: undefined | { videoId: string; indentifier: string; videoDuration: number } =
    undefined;

  try {
    const tokenVerifier = createVerifier({
      key: env.JWT_SIGNING_SECRET,
      cache: false,
      clockTimestamp: dayjs().utc().valueOf(),
    });

    tokenPayload = tokenVerifier(token);
  } catch (e: any) {
    console.log(e);
    c.status(401);
    return c.json({ success: false });
  }

  if (!tokenPayload) {
    c.status(401);
    return c.json({ success: false });
  }

  const userHasRateLimitActive = await cacheRedis.get(`rateLimit:${tokenPayload.indentifier}`);

  if (userHasRateLimitActive !== null) {
    c.status(429);
    return c.json({ success: false });
  }

  const [redis, queue] = await Promise.allSettled([
    cacheRedis.incr(`views:${tokenPayload.videoId}`),
    incrementViewsQueue.add(
      tokenPayload.videoId,
      { videoId: tokenPayload.videoId },
      {
        deduplication: {
          id: tokenPayload.videoId,
          ttl: 1000 * 60 * 1,
        },
      },
    ),
  ]);

  await cacheRedis.set(
    `rateLimit:${tokenPayload.indentifier}`,
    1,
    "EX",
    tokenPayload.videoDuration / 2,
  );

  return c.json({
    success: redis.status === "fulfilled" && queue.status === "fulfilled",
  });
});

serve({ ...api, port: Number(env.API_PORT), hostname: env.API_HOST }, (info) => {
  console.log(`Views service is listening on ${env.API_PROTOCOL}://${env.API_HOST}:${info.port}`);
});
