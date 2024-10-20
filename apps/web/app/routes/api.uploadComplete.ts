import { DeleteObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getAuth } from "@clerk/remix/ssr.server";
import { ActionFunctionArgs } from "@vercel/remix";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, eq, sql, users, videos } from "db";
import { json } from "@vercel/remix";
import { env } from "env/web";
import axios from "axios";
import { PLAN_STORAGE_SIZES } from "cms";

const schema = z.object({
  key: z.string(),
  title: z.string(),
  shouldCompress: z.boolean().default(false),
});

export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return json({ success: false, message: "Unauthorized" }, { status: 401 });
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
    return json({ success: false, message: "File not found" }, { status: 404 });
  }

  const userData = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
  });

  if (!userData) {
    await s3RootClient.send(
      new DeleteObjectCommand({
        Bucket: env.S3_MEDIA_BUCKET,
        Key: data.key,
      }),
    );
    return json({ message: "Unauthorized" }, { status: 401 });
  }

  if (
    userData.totalStorageUsed + response.ContentLength >
    PLAN_STORAGE_SIZES[userData.accountTier]
  ) {
    try {
      await s3RootClient.send(
        new DeleteObjectCommand({
          Bucket: env.S3_MEDIA_BUCKET,
          Key: data.key,
        }),
      );
    } catch (e) {
      console.log(e);
    }

    return json(
      {
        success: false,
        message: "Storage limit reached",
      },
      { status: 413 },
    );
  }

  let videoId = nanoid(8);

  while (
    (await db.query.videos.findFirst({
      where: (table, { eq }) => eq(table.id, videoId),
    })) !== undefined
  ) {
    videoId = nanoid(8);
  }

  const [videoData] = await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        totalStorageUsed: userData.totalStorageUsed + (response!.ContentLength ?? 0),
      })
      .where(eq(users.id, userId));

    return await tx
      .insert(videos)
      .values({
        id: videoId,
        authorId: userId,
        nativeFileKey: data.key,
        fileSizeBytes: response?.ContentLength ?? 0,
        title: data.title,
        sources: [
          {
            isNative: true,
            key: data.key,
            type: "video/mp4",
          },
        ],
      })
      .returning();
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

    await db.transaction(async (tx) => {
      tx.update(users)
        .set({
          totalStorageUsed: Math.max(userData.totalStorageUsed - (response?.ContentLength ?? 0), 0),
        })
        .where(eq(users.id, userId));

      tx.delete(videos).where(eq(videos.id, videoData.id));
    });
    return json({ success: false, message: "Failed to process video" }, { status: 500 });
  }

  return json({
    success: true,
    video: {
      id: videoData.id,
      title: videoData.title,
      fileSizeBytes: videoData.fileSizeBytes,
      createdAt: videoData.createdAt,
    },
  });
}
