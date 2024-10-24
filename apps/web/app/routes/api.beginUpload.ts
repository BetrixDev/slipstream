import { LoaderFunctionArgs } from "@vercel/remix";
import { nanoid } from "nanoid";
import { env } from "env/web";
import { getAuth } from "@clerk/remix/ssr.server";
import { json } from "@vercel/remix";
import { z } from "zod";
import { db } from "db";
import { MAX_FILE_SIZE_FREE_TIER, PLAN_STORAGE_SIZES } from "cms";
import axios from "axios";

type AuthorizeAccountResponse = {
  apiInfo: {
    storageApi: {
      apiUrl: string;
      downloadUrl: string;
      bucketName: string;
    };
  };
  authorizationToken: string;
};

type GetUploadUrlResponse = {
  bucketId: string;
  uploadUrl: string;
  authorizationToken: string;
};

const schema = z.object({
  contentLength: z.number(),
});

export async function action(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return json(null, { status: 401 });
  }

  const payload = schema.parse(await args.request.json());

  const userData = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
  });

  if (!userData) {
    return json(null, { status: 401 });
  }

  const maxFileSize = userData.accountTier === "free" ? MAX_FILE_SIZE_FREE_TIER : Infinity;

  if (
    userData.totalStorageUsed + payload.contentLength > PLAN_STORAGE_SIZES[userData.accountTier] ||
    payload.contentLength > maxFileSize
  ) {
    return json(
      {
        key: null,
        url: null,
        token: null,
      },
      { status: 413 },
    );
  }

  const objectKey = nanoid(25);
  // TODO: add a check to make sure this object key doesn't already exist

  const authorizeResponse = await axios<AuthorizeAccountResponse>(
    "https://api.backblazeb2.com/b2api/v3/b2_authorize_account",
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.B2_VIDEOS_WRITE_APP_KEY_ID}:${env.B2_VIDEOS_WRITE_APP_KEY}`).toString("base64")}`,
      },
    },
  );

  const uploadUrlResponse = await axios<GetUploadUrlResponse>(
    `${authorizeResponse.data.apiInfo.storageApi.apiUrl}/b2api/v3/b2_get_upload_url?bucketId=${encodeURIComponent(env.VIDEOS_BUCKET_ID)}`,
    {
      headers: {
        Authorization: authorizeResponse.data.authorizationToken,
      },
    },
  );

  return {
    url: uploadUrlResponse.data.uploadUrl,
    token: uploadUrlResponse.data.authorizationToken,
    key: objectKey,
  };
}
