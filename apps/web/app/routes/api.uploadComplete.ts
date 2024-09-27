import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getAuth } from "@clerk/remix/ssr.server";
import { ActionFunctionArgs } from "@remix-run/node";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, videos } from "db";
import { json } from "@vercel/remix";

const schema = z.object({
  key: z.string(),
  title: z.string(),
});

export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return json({ message: "Unauthorized" }, { status: 401 });
  }

  const data = schema.parse(await args.request.json());

  const headObjectCommand = new HeadObjectCommand({
    Bucket: process.env.S3_VIDEOS_BUCKET!,
    Key: data.key,
  });

  const s3RootClient = new S3Client({
    endpoint: process.env.S3_VIDEOS_ENDPOINT,
    region: process.env.S3_VIDEOS_REGION,
    credentials: {
      accessKeyId: process.env.S3_ROOT_ACCESS_KEY,
      secretAccessKey: process.env.S3_ROOT_SECRET_KEY,
    },
  });

  const response = await s3RootClient.send(headObjectCommand);

  if (response.ContentLength === undefined) {
    return json({ message: "File not found" }, { status: 404 });
  }

  let videoId = nanoid(8);

  while (
    (await db.query.videos.findFirst({
      where: (table, { eq }) => eq(table.id, videoId),
    })) !== undefined
  ) {
    videoId = nanoid(8);
  }

  await db.insert(videos).values({
    authorId: userId,
    id: videoId,
    key: data.key,
    fileSizeBytes: response.ContentLength,
    title: data.title,
  });

  return json({ success: true });
}
