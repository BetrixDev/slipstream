import { json, type LoaderFunctionArgs } from "@vercel/remix";
import { Queue } from "bullmq";
import { db } from "db";
import { env } from "env/web";
import { nanoid } from "nanoid";
import { logger } from "~/server/logger.server";

export const videoDeletionQueue = new Queue("{video-deletion}", {
  connection: {
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    password: env.REDIS_PASSWORD,
  },
});

export async function loader({ request }: LoaderFunctionArgs) {
  const token = request.headers.get("Authorization")?.split(" ")?.at(1);

  if (token !== env.CRON_SECRET) {
    return json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const taskLogger = logger.child({ taskId: nanoid(10), taskName: "delete-videos" });

  const taskStart = Date.now();
  taskLogger.info("Starting video retention deletion task");

  const videosToDelete = await db.query.videos.findMany({
    where: (table, { sql }) => sql`${table.deletionDate} < NOW()`,
    limit: 25,
    columns: {
      sources: true,
      largeThumbnailKey: true,
      smallThumbnailKey: true,
      id: true,
      fileSizeBytes: true,
      authorId: true,
    },
  });

  taskLogger.debug(`Found ${videosToDelete.length} video(s) to delete`);

  const jobs = videosToDelete.map(({ id }) => ({
    name: `video-deletion-${id}`,
    data: { videoId: id },
  }));

  await videoDeletionQueue.addBulk(jobs);

  const taskTime = ((Date.now() - taskStart) / 1000).toFixed(2);

  taskLogger.info(`Queued ${jobs.length} deletion job(s) in ${taskTime}s`, {
    elapsed: taskTime,
  });

  return json({ success: true });
}
