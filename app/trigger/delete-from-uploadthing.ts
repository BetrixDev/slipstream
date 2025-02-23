import { db } from "@/lib/db";
import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk/v3";
import assert from "node:assert";
import { UTApi } from "uploadthing/server";
import { z } from "zod";

export const deleteFromUploadthingTask = schemaTask({
  id: "delete-from-uploadthing",
  schema: z.object({
    videoId: z.string(),
  }),
  machine: {
    preset: "micro",
  },
  description:
    "Deletes files from Uploadthing that match the native files key in s3. Useful for removing a video from Uploadthing long after processing has finished to prevent users from trying to playback a video from Uploadthing that no longer exists.",
  run: async ({ videoId }) => {
    await import("../../app/lib/env");

    const utApi = new UTApi();

    const videoData = await logger.trace("Postgres videos", async (span) => {
      span.setAttributes({
        videoId,
        table: "videos",
      });

      const data = await db.query.videos.findFirst({
        where: (table, { eq }) => eq(table.id, videoId),
      });

      span.end();

      return data;
    });

    if (!videoData) {
      throw new AbortTaskRunError(`No video found with id ${videoId}`);
    }

    // Pull the keys from native files since they will share the same key in Uploadthing
    const utFileKeys = videoData.sources
      .filter((source) => source.isNative)
      .map((source) => source.key);

    await logger.trace("Delete files from Uploadthing", async (span) => {
      span.setAttributes({
        videoId,
        fileKeys: utFileKeys,
      });

      try {
        await utApi.deleteFiles(utFileKeys);
      } catch (error) {
        assert(error instanceof Error);

        span.setStatus({ code: 2, message: "Failed to delete files" });
        span.recordException(error);
        throw new Error(
          `Failed to delete files from Uploadthing: ${error.message}`
        );
      }

      span.end();
    });
  },
});
