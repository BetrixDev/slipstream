import axios from "axios";
import { env } from "env/processor";

export type AuthorizeAccountResponse = {
  apiInfo: {
    storageApi: {
      apiUrl: string;
      downloadUrl: string;
      bucketName: string;
    };
  };
  authorizationToken: string;
};

export type DownloadAuthorizationResponse = {
  authorizationToken: string;
  bucketId: string;
  fileNamePrefix: string;
};

export async function authorizeDownloadAccount() {
  return axios<AuthorizeAccountResponse>(
    "https://api.backblazeb2.com/b2api/v3/b2_authorize_account",
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.B2_VIDEOS_READ_APP_KEY_ID}:${env.B2_VIDEOS_READ_APP_KEY}`).toString("base64")}`,
      },
    },
  );
}

export async function authorizeUploadAccount() {
  return axios<AuthorizeAccountResponse>(
    "https://api.backblazeb2.com/b2api/v3/b2_authorize_account",
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.B2_VIDEOS_WRITE_APP_KEY_ID}:${env.B2_VIDEOS_WRITE_APP_KEY}`).toString("base64")}`,
      },
    },
  );
}

export async function getAuthorizedDownload(
  account: AuthorizeAccountResponse,
  {
    b2ContentType = "video/mp4",
    ...opts
  }: {
    bucketId: string;
    fileNamePrefix: string;
    validDurationInSeconds: number;
    b2ContentType?: string;
  },
) {
  return await axios<DownloadAuthorizationResponse>(
    `${account.apiInfo.storageApi.apiUrl}/b2api/v3/b2_get_download_authorization`,
    {
      method: "POST",
      headers: {
        Authorization: account.authorizationToken,
      },
      data: {
        b2ContentDisposition: "attachment",
        b2ContentType,
        ...opts,
      },
    },
  );
}

export type UploadUrlResponse = {
  bucketId: string;
  uploadUrl: string;
  authorizationToken: string;
};

export async function getUploadUrl(account: AuthorizeAccountResponse, bucketId: string) {
  return await axios<UploadUrlResponse>(
    `${account.apiInfo.storageApi.apiUrl}/b2api/v3/b2_get_upload_url?bucketId=${encodeURIComponent(bucketId)}`,
    {
      method: "GET",
      headers: {
        Authorization: account.authorizationToken,
      },
    },
  );
}
