import { getAuth } from "@clerk/remix/ssr.server";
import { ActionFunctionArgs, json } from "@remix-run/node";
import { z } from "zod";
import { db, videos, and, eq } from "db";

const schema = z.object({
  id: z.string(),
  title: z.string().optional(),
  isPrivate: z.boolean().optional(),
});

export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return json(undefined, { status: 401 });
  }

  const body = schema.parse(await args.request.json());

  const videoData = await db.query.videos.findFirst({
    where: (table, { eq, and }) => and(eq(table.id, body.id), eq(table.authorId, userId)),
  });

  if (!videoData) {
    return json(undefined, { status: 400 });
  }

  await db
    .update(videos)
    .set({
      title: body.title,
      isPrivate: body.isPrivate,
    })
    .where(and(eq(videos.id, body.id), eq(videos.authorId, userId)));

  return json({ success: true, title: body.title ?? videoData.title });
}
