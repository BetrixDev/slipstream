import { getAuth } from "@clerk/remix/ssr.server";
import { ActionFunctionArgs, json } from "@remix-run/node";
import { db, eq, sql, users, videos } from "db";

export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args);

  const user = userId ?? (await args.request.json()).userId;

  const [{ totalVideoStorage }] = await db
    .select({
      totalVideoStorage: sql<number>`sum(${videos.fileSizeBytes})`,
    })
    .from(videos)
    .where(eq(videos.authorId, user))
    .execute();

  await db
    .update(users)
    .set({
      totalStorageUsed: totalVideoStorage,
    })
    .where(eq(users.id, user))
    .execute();

  return json({ success: true, totalVideoStorage });
}
