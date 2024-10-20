import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "env/web";

export async function action() {
  const s3 = new S3Client({
    region: env.S3_VIDEOS_REGION,
    endpoint: env.S3_VIDEOS_ENDPOINT,
    credentials: {
      accessKeyId: env.S3_ROOT_ACCESS_KEY,
      secretAccessKey: env.S3_ROOT_SECRET_KEY,
    },
  });

  const response = await s3.send(
    new PutBucketCorsCommand({
      Bucket: env.S3_VIDEOS_BUCKET,
      CORSConfiguration: {
        CORSRules: new Array({
          AllowedHeaders: ["content-type"],
          AllowedMethods: ["GET", "PUT", "HEAD"],
          AllowedOrigins: ["*"],
          ExposeHeaders: [],
          MaxAgeSeconds: 3000,
        }),
      },
    }),
  );

  return response;
}
