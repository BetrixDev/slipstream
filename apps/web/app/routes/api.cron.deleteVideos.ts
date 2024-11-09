import { json, type LoaderFunctionArgs } from "@vercel/remix";
import { db } from "db";
import { env } from "~/server/env";
import { nanoid } from "nanoid";
import { logger } from "~/server/logger.server";
import { tasks } from "@trigger.dev/sdk/v3";
import { videoDeletionTask } from "trigger";

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

  const jobs = videosToDelete.map(({ id }) => ({ payload: { videoId: id } }));

  await tasks.batchTrigger<typeof videoDeletionTask>("video-deletion", jobs);

  const taskTime = ((Date.now() - taskStart) / 1000).toFixed(2);

  taskLogger.info(`Queued ${jobs.length} deletion job(s) in ${taskTime}s`, {
    elapsed: taskTime,
  });

  return json({ success: true });
}
