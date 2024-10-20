import { Webhook } from "svix";
import { ActionFunctionArgs } from "@vercel/remix";
import { WebhookEvent } from "@clerk/remix/ssr.server";
import { db, users, eq } from "db";
import { json } from "@vercel/remix";
import { env } from "env/web";

export async function action(args: ActionFunctionArgs) {
  const headerPayload = args.request.headers;
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  const payload = await args.request.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);

  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  if (event.type === "user.created") {
    const userPrimaryEmail = event.data.email_addresses.find(
      (e) => e.id === event.data.primary_email_address_id,
    )!;

    await db.insert(users).values({
      id: event.data.id,
      email: userPrimaryEmail.email_address,
      createdAt: event.data.created_at,
    });
  } else if (event.type === "user.deleted") {
    if (event.data.id && event.data.deleted) {
      await db.delete(users).where(eq(users.id, event.data.id));
    }
  } else if (event.type === "user.updated") {
    const userPrimaryEmail = event.data.email_addresses.find(
      (e) => e.id === event.data.primary_email_address_id,
    )!;

    await db
      .update(users)
      .set({
        email: userPrimaryEmail.email_address,
      })
      .where(eq(users.id, event.data.id));
  }

  return json({ success: true }, { status: 200 });
}
