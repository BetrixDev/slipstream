import { db } from "../../../app/lib/db.js";
import { logger, schedules, tasks } from "@trigger.dev/sdk/v3";
import type { videoDeletionTask } from "../video-deletion.js";

export const deleteVideosScheduledTask = schedules.task({
  id: "delete-videos",
  cron: "0 * * * *",
  run: async () => {
    const videosToDelete = await logger.trace(
      "Postgres videos to delete",
      async (span) => {
        span.setAttributes({
          table: "videos",
          limit: 25,
        });

        const videos = await db.query.videos.findMany({
          where: (table, { sql }) => sql`${table.pendingDeletionDate} < NOW()`,
          limit: 25,
        });

        span.end();

        return videos;
      }
    );

    const jobs = videosToDelete.map(({ id }) => ({ payload: { videoId: id } }));

    if (jobs.length === 0) {
      return { success: true, message: "No videos to delete" };
    }

    await logger.trace("Batch trigger video deletion", async (span) => {
      span.setAttributes({
        jobCount: jobs.length,
      });

      await tasks.batchTrigger<typeof videoDeletionTask>(
        "video-deletion",
        jobs
      );

      span.end();
    });

    return {
      success: true,
      message: `Queued ${jobs.length} video(s) to be deleted`,
    };
  },
});
