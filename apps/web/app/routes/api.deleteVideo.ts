import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getAuth } from "@clerk/remix/ssr.server";
import { ActionFunctionArgs, json } from "@remix-run/node";
import { z } from "zod";
import { db, videos, and, eq, users, sql } from "db";
import { env } from "env/web";
import { UTApi } from "uploadthing/server";

const schema = z.object({
  videoId: z.string(),
});

const s3Client = new S3Client({
  endpoint: env.S3_MEDIA_ENDPOINT,
  region: env.S3_MEDIA_REGION,
  credentials: {
    accessKeyId: env.S3_ROOT_ACCESS_KEY,
    secretAccessKey: env.S3_ROOT_SECRET_KEY,
  },
});

const utApi = new UTApi({ token: env.UPLOADTHING_TOKEN });

export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return json(
      { success: false, message: "You must be logged in to delete a video." },
      { status: 401 },
    );
  }

  const parseResult = schema.safeParse(await args.request.json());

  if (!parseResult.success) {
    return json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  const { videoId } = parseResult.data;

  const videoData = await db.query.videos.findFirst({
    where: (table, { and, eq }) => and(eq(table.id, videoId), eq(table.authorId, userId)),
  });

  if (!videoData) {
    return json({ success: false, message: "Video not found." }, { status: 404 });
  }

  const command = new DeleteObjectCommand({
    Bucket: env.S3_MEDIA_BUCKET,
    Key: videoData.key,
  });

  const thumbnailsToDelete: string[] = [];

  if (videoData.smallThumbnailKey) {
    thumbnailsToDelete.push(videoData.smallThumbnailKey);
  }

  if (videoData.largeThumbnailKey) {
    thumbnailsToDelete.push(videoData.largeThumbnailKey);
  }

  try {
    await db.transaction(async (tx) => {
      try {
        await Promise.all([
          s3Client.send(command),
          utApi.deleteFiles(thumbnailsToDelete),
          tx.delete(videos).where(and(eq(videos.id, videoId), eq(videos.authorId, userId))),
          tx
            .update(users)
            .set({ totalStorageUsed: sql`${users.totalStorageUsed} - ${videoData.fileSizeBytes}` })
            .where(eq(users.id, userId)),
        ]);
      } catch (e) {
        console.log(e);
        tx.rollback();
      }
    });
  } catch (e) {
    return json({ success: false, message: "Failed to delete video." }, { status: 500 });
  }

  return json({ success: true, title: videoData.title });
}
