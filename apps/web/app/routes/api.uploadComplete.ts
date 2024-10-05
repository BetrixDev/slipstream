import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getAuth } from "@clerk/remix/ssr.server";
import { ActionFunctionArgs } from "@remix-run/node";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, videos } from "db";
import { json } from "@vercel/remix";
import { env } from "env/web";
import axios from "axios";

const schema = z.object({
  key: z.string(),
  title: z.string(),
  shouldCompress: z.boolean().default(false),
});

export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return json({ message: "Unauthorized" }, { status: 401 });
  }

  const data = schema.parse(await args.request.json());

  const headObjectCommand = new HeadObjectCommand({
    Bucket: env.S3_MEDIA_BUCKET,
    Key: data.key,
  });

  const s3RootClient = new S3Client({
    endpoint: env.S3_MEDIA_ENDPOINT,
    region: env.S3_MEDIA_BUCKET,
    credentials: {
      accessKeyId: env.S3_ROOT_ACCESS_KEY,
      secretAccessKey: env.S3_ROOT_SECRET_KEY,
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

  try {
    await axios.put(
      `${env.PROCESSOR_API_URL}/videoUploaded`,
      {
        videoId,
      },
      {
        headers: {
          Authorization: `Bearer ${env.PROCESSOR_SECRET_KEY}`,
        },
      },
    );
  } catch (e) {
    console.error(e);
    return json({ message: "Failed to process video" }, { status: 500 });
  }

  return json({
    success: true,
    video: {
      id: videoId,
      title: data.title,
      fileSizeBytes: response.ContentLength,
    },
  });
}
