import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAuth } from "@clerk/remix/ssr.server";
import { json, LoaderFunctionArgs } from "@vercel/remix";
import { db } from "db";
import { env } from "env/web";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return json({ url: null }, { status: 401 });
  }

  const videoId = args.params["videoId"];

  if (!videoId) {
    return json({ url: null }, { status: 400 });
  }

  const videoData = await db.query.videos.findFirst({
    where: (table, { eq }) => eq(table.id, videoId),
  });

  if (!videoData) {
    return json({ url: null }, { status: 404 });
  }

  const s3ReadOnlyClient = new S3Client({
    region: env.S3_MEDIA_REGION,
    endpoint: env.S3_MEDIA_ENDPOINT,
    credentials: {
      accessKeyId: env.S3_READ_ONLY_ACCESS_KEY,
      secretAccessKey: env.S3_READ_ONLY_SECRET_KEY,
    },
  });

  const command = new GetObjectCommand({
    Bucket: env.S3_MEDIA_BUCKET,
    Key: videoData.key,
  });

  const url = await getSignedUrl(s3ReadOnlyClient as any, command, {
    expiresIn: 3600,
  });

  return json({
    url,
  });
}
