import { db } from "db";
import { thumbnailQueue } from "~/queues/thumbnail";
import { transcodingQueue } from "~/queues/transcoding";

export default defineEventHandler(async (event) => {
  const { videoId } = await readBody(event);

  if (!videoId) {
    throw createError({
      statusCode: 400,
      message: "videoId not provided in request body",
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

  await transcodingQueue.add(`trancode-${videoId}`, {
    videoId: videoData.id,
    nativeFileKey: videoData.nativeFileKey,
  });

  return {
    success: true,
    message: `Video processing has been queue for ${videoId}`,
  };
});
