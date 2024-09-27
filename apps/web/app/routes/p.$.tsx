/* eslint-disable jsx-a11y/media-has-caption */
import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { db } from "db";
import { Button } from "~/components/ui/button";
import { Eye, SquareArrowOutUpRight, Video } from "lucide-react";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { json } from "@vercel/remix";
import { getAuth } from "@clerk/remix/ssr.server";

export const meta: MetaFunction<typeof loader> = ({ params, data }) => {
  const videoId = params["*"];

  const tags: ReturnType<MetaFunction> = [
    {
      name: "og:url",
      content: `https://flowble.app/p/${videoId}`,
    },
  ];

  if (!data) {
    return tags;
  }

  tags.push(
    ...[
      {
        name: "og:title",
        content: data.title,
      },
      {
        name: "twitter:title",
        content: data.title,
      },
      {
        name: "og:image",
        content: data.largeThumbnailUrl,
      },
      {
        name: "og:description",
        content: `Watch ${data.title} on Flowble!`,
      },
      {
        name: "twitter:description",
        content: `Watch ${data.title} on Flowble!`,
      },
      {
        name: "og:type",
        content: "video",
      },
      {
        name: "twitter:image",
        content: data.largeThumbnailUrl,
      },
      {
        name: "og:image",
        content: data.largeThumbnailUrl,
      },
      {
        name: "twitter:card",
        content: data.isPrivate ? "summary_large_image" : "player",
      },
    ],
  );

  return tags;
};

export async function loader(args: LoaderFunctionArgs) {
  const videoId = args.params["*"];

  if (!videoId) {
    return json(undefined, { status: 400 });
  }

  const videoData = await db.query.videos.findFirst({
    where: (table, { eq }) => eq(table.id, videoId),
    columns: {
      title: true,
      views: true,
      key: true,
      isPrivate: true,
      authorId: true,
      isProcessing: true,
      largeThumbnailUrl: true,
    },
  });

  if (!videoData) {
    return json(undefined, { status: 404 });
  }

  if (videoData.isPrivate) {
    const { userId } = await getAuth(args);

    if (userId === null || videoData.authorId !== userId) {
      return json(undefined, { status: 403 });
    }
  }

  const s3ReadOnlyClient = new S3Client({
    region: process.env.S3_VIDEOS_REGION,
    endpoint: process.env.S3_VIDEOS_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_READ_ONLY_ACCESS_KEY!,
      secretAccessKey: process.env.S3_READ_ONLY_SECRET_KEY!,
    },
  });

  const command = new GetObjectCommand({
    Bucket: process.env.S3_VIDEOS_BUCKET!,
    Key: videoData.isProcessing ? videoData.key + "-processing" : videoData.key,
  });

  const url = await getSignedUrl(s3ReadOnlyClient, command, {
    expiresIn: 300,
  });

  return json(
    {
      url,
      views: videoData.views,
      title: videoData.title,
      isProcessing: videoData.isProcessing,
      largeThumbnailUrl: videoData.largeThumbnailUrl,
      isPrivate: videoData.isPrivate,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=3600, immutable",
      },
    },
  );
}

export default function VideoPlayerRouter() {
  const { url, title, views } = useLoaderData<typeof loader>();

  return (
    <div className="h-screen flex flex-col">
      <header className="max-h-16 h-16 flex justify-between items-center px-6">
        <Link className="flex items-center" to="/">
          <button className="flex-shrink-0 flex items-center z-10">
            <Video className="h-8 w-8 text-blue-500 mt-1" />
            <span className="ml-2 text-2xl font-bold">Flowble</span>
          </button>
        </Link>
        <Link className="flex items-center" to="/">
          <Button variant="outline" className="text-md flex gap-2 items-center">
            <SquareArrowOutUpRight className="w-5 h-5" />
            Go to Flowble
          </Button>
        </Link>
      </header>
      <div className="h-32 flex items-center justify-center">
        <div className="border w-[600px] h-24 text-muted flex items-center justify-center">
          Advertisment goes here
        </div>
      </div>
      <div className="grow flex flex-col items-center">
        <div className="min-w-[280px] min-h-[200px] h-[calc(100vh-20rem)] aspect-video relative group flex justify-center items-center">
          <video className="max-h-full" src={url} controls />
          <div className="absolute bottom-[-4rem] h-16 w-full flex items-center px-4">
            <div>
              <h1 className="font-medium text-xl">{title}</h1>
              <h6 className="flex gap-2">
                <Eye /> {views.toLocaleString()} views
              </h6>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
