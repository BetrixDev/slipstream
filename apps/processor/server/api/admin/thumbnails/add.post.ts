import { db } from "db";
import { thumbnailQueue } from "~/queues/thumbnail";

export default defineEventHandler(async (event) => {
  const { videoId } = await readBody(event);

  if (!videoId) {
    throw createError({
      statusCode: 400,
      message: "videoId is required in request body",
      data: {
        sucess: false,
      },
    });
  }

  const videoData = await db.query.videos.findFirst({
    where: (table, { eq }) => eq(table.id, videoId),
  });

  if (!videoData) {
    throw createError({
      statusCode: 404,
      message: `Video with id ${videoId} not found`,
      data: {
        sucess: false,
      },
    });
  }

  await thumbnailQueue.add(`thumbnail-${videoId}`, {
    videoId,
  });

  return {
    success: true,
    message: `Thumbnail job queued for video ${videoData.title}`,
  };
});
