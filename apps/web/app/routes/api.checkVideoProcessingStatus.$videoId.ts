import { getAuth } from "@clerk/remix/ssr.server";
import { json, LoaderFunctionArgs } from "@vercel/remix";
import { db } from "db";
import { env } from "env/web";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return json(undefined, { status: 401 });
  }

  const videoId = args.params["videoId"];

  if (!videoId) {
    return json({ message: "Bad Request" }, { status: 400 });
  }

  const videoData = await db.query.videos.findFirst({
    where: (table, { eq }) => eq(table.id, videoId),
  });

  if (!videoData) {
    return json({ message: "Video not found." }, { status: 404 });
  }

  return json({
    smallThumbnailUrl: videoData.smallThumbnailKey
      ? `${env.THUMBNAIL_BASE_URL}/${videoData.smallThumbnailKey}`
      : null,
    videoLengthSeconds: videoData.videoLengthSeconds,
  });
}
