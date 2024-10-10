/* eslint-disable jsx-a11y/media-has-caption */
import { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, redirect, useLoaderData } from "@remix-run/react";
import { db } from "db";
import { Button } from "~/components/ui/button";
import { Eye, SquareArrowOutUpRight, UserRoundIcon, Video } from "lucide-react";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { json } from "@vercel/remix";
import { getAuth } from "@clerk/remix/ssr.server";
import { env } from "env/web";
import { Card, CardContent } from "~/components/ui/card";
import { createSigner } from "fast-jwt";
import { getClientIPAddress } from "remix-utils/get-client-ip-address";
import dayjs from "dayjs";
import { useEffect } from "react";
import axios from "axios";
import { WordyDate } from "~/components/wordy-date";

const s3ReadOnlyClient = new S3Client({
  region: env.S3_MEDIA_REGION,
  endpoint: env.S3_MEDIA_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_READ_ONLY_ACCESS_KEY,
    secretAccessKey: env.S3_READ_ONLY_SECRET_KEY,
  },
});

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

export async function action(args: ActionFunctionArgs) {
  const videoId = args.params["*"];

  if (!videoId) {
    return json({ success: false }, { status: 400 });
  }

  const { userId } = await getAuth(args);

  if (!userId) {
    return json({ success: false }, { status: 401 });
  }

  return json({ success: true });
}

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
      videoLengthSeconds: true,
      createdAt: true,
    },
  });

  if (!videoData) {
    return json(undefined, { status: 404 });
  }

  const { userId } = await getAuth(args);

  if (videoData.isPrivate) {
    if (userId === null || videoData.authorId !== userId) {
      return redirect("/");
    }
  }

  const ipAddress = getClientIPAddress(args.request);

  const identifier = ipAddress ?? userId ?? videoId;

  const utcTimestamp = dayjs.utc().valueOf();

  const signSync = createSigner({
    key: env.JWT_SIGNING_SECRET,
    clockTimestamp: utcTimestamp,
  });

  const token = signSync({
    videoId: videoId,
    identifier,
    videoDuration: videoData.videoLengthSeconds ?? 30,
  });

  const command = new GetObjectCommand({
    Bucket: env.S3_MEDIA_BUCKET,
    Key: videoData.key,
  });

  const url = await getSignedUrl(s3ReadOnlyClient as any, command, {
    expiresIn: 300,
  });

  return json({
    url,
    views: videoData.views,
    title: videoData.title,
    isProcessing: videoData.isProcessing,
    largeThumbnailUrl: videoData.largeThumbnailUrl,
    isPrivate: videoData.isPrivate,
    videoLengthSeconds: videoData.videoLengthSeconds,
    createdAt: videoData.createdAt,
    isViewerAuthor: videoData.authorId === userId,
    token,
  });
}

export default function VideoPlayerRouter() {
  const loaderData = useLoaderData<typeof loader>();

  if (!loaderData) {
    return <div>This video is private</div>;
  }

  const { url, title, views, largeThumbnailUrl, createdAt, isViewerAuthor } = loaderData;

  useEffect(() => {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => {
        axios("/api/view", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${loaderData.token}`,
          },
          signal: controller.signal,
        });
      },
      ((loaderData.videoLengthSeconds ?? 30) / 2) * 1000,
    );

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <header className="max-h-16 h-16 flex justify-between items-center px-4">
        <Link className="flex items-center" to="/">
          <button className="flex-shrink-0 flex items-center z-10">
            <Video className="h-8 w-8 text-blue-500 mt-1" />
            <span className="ml-2 text-2xl font-bold">Flowble</span>
          </button>
        </Link>
        <Link className="flex items-center" to={isViewerAuthor ? "/videos" : "/"}>
          <Button variant="outline" className="text-md flex gap-2 items-center rounded-lg h-10">
            <SquareArrowOutUpRight className="w-5 h-5" />
            Go to Flowble
          </Button>
        </Link>
      </header>
      <div className="flex gap-4 p-4 max-w-full h-full flex-col xl:flex-row">
        <Card className="grow"></Card>
        <div className="flex flex-col gap-4 min-w-96">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h1 className="text-2xl font-bold">{title}</h1>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Uploaded on <WordyDate timestamp={createdAt} />
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {views.toLocaleString()} views
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="grow min-h-64"></Card>
        </div>
      </div>
    </div>
  );
}
