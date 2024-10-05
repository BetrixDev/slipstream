import { LoaderFunctionArgs } from "@remix-run/node";
import { nanoid } from "nanoid";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "env/web";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAuth } from "@clerk/remix/ssr.server";
import { json } from "@vercel/remix";
import { z } from "zod";
import { db } from "db";
import { PLAN_STORAGE_SIZES } from "../../../../packages/cms/src/index";

const schema = z.object({
  contentLength: z.number(),
});

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return json(undefined, { status: 401 });
  }

  const payload = schema.parse(await args.request.json());

  const userData = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
  });

  if (!userData) {
    return json(undefined, { status: 401 });
  }

  if (
    userData.totalStorageUsed + payload.contentLength >
    PLAN_STORAGE_SIZES[userData.accountTier]
  ) {
    return json(
      {
        key: null,
        url: null,
      },
      { status: 413 },
    );
  }

  const objectKey = nanoid(25);

  const s3WriteClient = new S3Client({
    endpoint: env.S3_MEDIA_ENDPOINT,
    region: env.S3_MEDIA_REGION,
    credentials: {
      accessKeyId: env.S3_WRITE_ONLY_ACCESS_KEY,
      secretAccessKey: env.S3_WRITE_ONLY_SECRET_KEY,
    },
  });

  const url = await getSignedUrl(
    s3WriteClient as any,
    new PutObjectCommand({
      Bucket: env.S3_MEDIA_BUCKET,
      Key: objectKey,
    }),
    {
      expiresIn: 3600,
    },
  );

  return { url, key: objectKey };
}
