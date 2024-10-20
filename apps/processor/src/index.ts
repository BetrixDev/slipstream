import { Hono } from "hono";
import { db } from "db";
import { env } from "env/processor";
import { serve } from "@hono/node-server";
import { bearerAuth } from "hono/bearer-auth";
import { logger as honoLogger } from "hono/logger";
import { logger } from "./logger.js";

import { transcodingQueue } from "./queues/transcoding.js";
import { thumbnailQueue } from "./queues/thumbnail.js";

import "./workers/transcoding.js";
import "./workers/thumbnail.js";

const api = new Hono();

api.use(
  honoLogger((message, rest) => {
    logger.info(message, rest);
  }),
);

api.use("/api/*", bearerAuth({ token: env.API_SECRET }));

api.get("/hc", (c) => c.text("Processor service is running"));

api.put("/api/videoUploaded", async (c) => {
  const { videoId } = await c.req.json();

  if (!videoId) {
    c.status(400);
    return c.text("bad request");
  }

  const videoData = await db.query.videos.findFirst({
    where: (table, { eq }) => eq(table.id, videoId),
  });

  if (!videoData) {
    c.status(400);
    return c.text("bad request");
  }

  await thumbnailQueue.add(`thumbnail-${videoId}`, {
    videoId,
  });

  await transcodingQueue.add(`trancode-${videoId}`, {
    videoId: videoData.id,
    nativeFileKey: videoData.nativeFileKey,
  });

  c.status(200);
  return c.text("Video processing has been queued");
});

api.put("/admin/thumbnails/add", async (c) => {
  const { videoId } = await c.req.json();

  if (!videoId) {
    c.status(400);
    return c.text("bad request");
  }

  const videoData = await db.query.videos.findFirst({
    where: (table, { eq }) => eq(table.id, videoId),
  });

  if (!videoData) {
    c.status(400);
    return c.text("bad request");
  }

  await thumbnailQueue.add(`thumbnail-${videoId}`, {
    videoId,
  });

  c.status(200);
  return c.text("Thumbnail processing has been queued");
});

api.put("/admin/transcoding/add", async (c) => {
  const { videoId } = await c.req.json();

  if (!videoId) {
    c.status(400);
    return c.text("bad request");
  }

  const videoData = await db.query.videos.findFirst({
    where: (table, { eq }) => eq(table.id, videoId),
  });

  if (!videoData) {
    c.status(400);
    return c.text("bad request");
  }

  await thumbnailQueue.add(`thumbnail-${videoId}`, {
    videoId,
  });

  c.status(200);
  return c.text("Transcoding has been queued");
});

serve({ ...api, port: Number(env.API_PORT), hostname: env.API_HOST }, (info) => {
  logger.info(
    `Processor service is listening on ${env.API_PROTOCOL}://${env.API_HOST}:${info.port}`,
  );
});
