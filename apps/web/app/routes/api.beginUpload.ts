import { getAuth } from "@clerk/remix/ssr.server";
import { LoaderFunctionArgs } from "@remix-run/node";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { json } from "@vercel/remix";
import { nanoid } from "nanoid";
import { S3Client } from "@aws-sdk/client-s3";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return json(undefined, { status: 401 });
  }

  const searchParams = new URLSearchParams(args.request.url);
  const isPrivate = searchParams.get("isPrivate") === "true";

  const objectKey = nanoid(25);

  const s3WriteClient = new S3Client({
    endpoint: process.env.S3_VIDEOS_ENDPOINT,
    region: process.env.S3_VIDEOS_REGION,
    credentials: {
      accessKeyId: process.env.S3_ROOT_ACCESS_KEY,
      secretAccessKey: process.env.S3_ROOT_SECRET_KEY,
    },
  });

  // TODO: use a write only client here and not root
  const { url, fields } = await createPresignedPost(s3WriteClient, {
    Bucket: process.env.S3_VIDEOS_BUCKET,
    Key: `${objectKey}-processing`,
    Conditions: [["content-length-range", 0, 1000000000]],
    Expires: 20,
    Fields: {
      acl: isPrivate ? "private" : "public-read",
    },
  });

  return json({ url, fields });
}
