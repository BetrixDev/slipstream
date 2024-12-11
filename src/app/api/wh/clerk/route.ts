import { Webhook } from "svix";
import { headers } from "next/headers";
import { type WebhookEvent, clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { users, videos } from "@/lib/schema";
import { tasks } from "@trigger.dev/sdk/v3";
import type { videoDeletionTask } from "@/trigger/video-deletion";
import { eq, sql } from "drizzle-orm";

export async function POST(request: Request) {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  // You can find this in the Clerk Dashboard -> Webhooks -> choose the endpoint
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local");
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await request.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let event: WebhookEvent;

  // Verify the payload with the headers
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

    const stripeCustomer = await stripe.customers.create({
      email: userPrimaryEmail.email_address,
      name: event.data.username ?? undefined,
      phone: event.data.phone_numbers.find((p) => p.id === event.data.primary_phone_number_id)
        ?.phone_number,
    });

    await Promise.all([
      db.insert(users).values({
        id: event.data.id,
        email: userPrimaryEmail.email_address,
        createdAt: sql`to_timestamp(${event.data.created_at} / 1000.0)`,
        stripeCustomerId: stripeCustomer.id,
      }),
      clerkClient().then((clerk) =>
        clerk.users.updateUserMetadata(event.data.id, {
          publicMetadata: {
            accountTier: "free",
          },
        }),
      ),
    ]);
  } else if (event.type === "user.deleted") {
    if (event.data.id && event.data.deleted) {
      const [deletedVideos, [deletedUser]] = await Promise.all([
        db.delete(videos).where(eq(videos.authorId, event.data.id)).returning(),
        db.delete(users).where(eq(users.id, event.data.id)).returning(),
      ]);

      const videoDeletionTasks = deletedVideos.map((video) => ({ payload: { videoId: video.id } }));

      await Promise.all([
        stripe.customers.del(deletedUser.stripeCustomerId),
        tasks.batchTrigger<typeof videoDeletionTask>("video-deletion", videoDeletionTasks),
      ]);
    }
  } else if (event.type === "user.updated") {
    const userPrimaryEmail = event.data.email_addresses.find(
      (e) => e.id === event.data.primary_email_address_id,
    )!;

    const [updatedUser] = await db
      .update(users)
      .set({
        email: userPrimaryEmail.email_address,
      })
      .where(eq(users.id, event.data.id))
      .returning();

    await stripe.customers.update(updatedUser.stripeCustomerId, {
      email: updatedUser.email,
    });
  }

  return new Response("", { status: 200 });
}
