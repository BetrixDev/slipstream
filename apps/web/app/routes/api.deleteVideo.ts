import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getAuth } from "@clerk/remix/ssr.server";
import { ActionFunctionArgs, json } from "@remix-run/node";
import { z } from "zod";
import { db, videos, and, eq } from "db";

const schema = z.object({
  videoId: z.string(),
});

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
    Bucket: process.env.S3_VIDEOS_BUCKET,
    Key: videoData.key,
  });

  const s3Client = new S3Client({
    endpoint: process.env.S3_VIDEOS_ENDPOINT,
    region: process.env.S3_VIDEOS_REGION,
    credentials: {
      accessKeyId: process.env.S3_ROOT_ACCESS_KEY,
      secretAccessKey: process.env.S3_ROOT_SECRET_KEY,
    },
  });

  try {
    await db.transaction(async (tx) => {
      try {
        await Promise.all([
          s3Client.send(command),
          tx.delete(videos).where(and(eq(videos.id, videoId), eq(videos.authorId, userId))),
        ]);
      } catch (e) {
        tx.rollback();
      }
    });
  } catch (error) {
    return json({ success: false, message: "Failed to delete video." }, { status: 500 });
  }

  return json({ success: true, title: videoData.title });
}
