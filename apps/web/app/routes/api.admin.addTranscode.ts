import { json, type ActionFunctionArgs } from "@vercel/remix";
import { Queue } from "bullmq";
import { db } from "db";
import { env } from "env/web";

export const transcodingQueue = new Queue("{transcoding}", {
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

  await transcodingQueue.add(`transcoding-${videoId}`, {
    videoId,
    nativeFileKey: videoData.nativeFileKey,
  });

  return json({
    success: true,
    message: `Added video "${videoData.title}" with id ${videoId} to transcoding queue`,
  });
}
