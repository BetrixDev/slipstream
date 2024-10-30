import { json, type ActionFunctionArgs } from "@vercel/remix";
import { Queue } from "bullmq";
import { db } from "db";
import { env } from "~/server/env";

export const videoDeletionQueue = new Queue("{video-deletion}", {
  connection: {
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    password: env.REDIS_PASSWORD,
  },
});

export async function action({ request }: ActionFunctionArgs) {
  const token = request.headers.get("Authorization")?.split(" ")?.at(1);

  if (token !== env.ADMIN_SECRET) {
    return json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { videoId } = await request.json();

  const videoData = await db.query.videos.findFirst({
    where: (table, { eq }) => eq(table.id, videoId),
    columns: {
      title: true,
      nativeFileKey: true,
    },
  });

  if (!videoData) {
    return json(
      { success: false, message: `No video with id ${videoId} found in database` },
      { status: 404 },
    );
  }

  await videoDeletionQueue.add(`video-deletion-${videoId}`, {
    videoId,
  });

  return json({
    success: true,
    message: `Added video "${videoData.title}" with id ${videoId} to video deletion queue`,
  });
}
