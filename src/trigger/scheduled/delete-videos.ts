import { schedules, tasks } from "@trigger.dev/sdk/v3";
import { db } from "@/lib/db";
import { videoDeletionTask } from "../video-deletion.js";

export const deleteVideosScheduledTask = schedules.task({
  id: "delete-videos",
  cron: "0 * * * *",
  run: async () => {
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

    const jobs = videosToDelete.map(({ id }) => ({ payload: { videoId: id } }));

    if (jobs.length === 0) {
      return { success: true, message: "No videos to delete" };
    }

    await tasks.batchTrigger<typeof videoDeletionTask>("video-deletion", jobs);

    return { success: true, message: `Queue ${jobs.length} video(s) to be deleted` };
  },
});
