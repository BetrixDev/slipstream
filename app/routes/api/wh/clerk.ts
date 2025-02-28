import { clerkClient, type WebhookEvent } from "@clerk/tanstack-start/server";
import { json } from "@tanstack/start";
import { createAPIFileRoute } from "@tanstack/start/api";
import { Webhook } from "svix";
import { getHeaders } from "@tanstack/start/server";
import { Polar } from "@polar-sh/sdk";
import { db } from "@/lib/db";
import { users, videos } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { tasks } from "@trigger.dev/sdk/v3";
import type { videoDeletionTask } from "@/trigger/video-deletion";

export const APIRoute = createAPIFileRoute("/api/wh/clerk")({
  POST: async ({ request }) => {
    const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      throw new Error(
        "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
      );
    }

    const headers = getHeaders();
    const svix_id = headers["svix-id"];
    const svix_timestamp = headers["svix-timestamp"];
    const svix_signature = headers["svix-signature"];

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Error occured -- no svix headers", {
        status: 400,
      });
    }

    const payload = await request.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(WEBHOOK_SECRET);

    let event: WebhookEvent;

    const clerk = clerkClient({});

    const polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN,
    });

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
        (e) => e.id === event.data.primary_email_address_id
      );

      if (!userPrimaryEmail) {
        return new Response("Error occured - no user primary email", {
          status: 400,
        });
      }

      const polarCustomer = await polar.customers.create({
        email: userPrimaryEmail.email_address,
        name: event.data.username ?? undefined,
        metadata: {
          userId: event.data.id,
        },
      });

      const dbPromise = db.insert(users).values({
        id: event.data.id,
        email: userPrimaryEmail.email_address,
        createdAt: sql`to_timestamp(${event.data.created_at} / 1000.0)`,
        polarCustomerId: polarCustomer.id,
      });

      const clerkPromise = clerk.users.updateUserMetadata(event.data.id, {
        publicMetadata: {
          accountTier: "free",
        },
      });

      await Promise.all([dbPromise, clerkPromise]);
    } else if (event.type === "user.deleted") {
      if (event.data.id && event.data.deleted) {
        const [deletedVideos, [deletedUser]] = await Promise.all([
          db
            .delete(videos)
            .where(eq(videos.authorId, event.data.id))
            .returning(),
          db.delete(users).where(eq(users.id, event.data.id)).returning(),
        ]);

        const videoDeletionTasks = deletedVideos.map((video) => ({
          payload: { videoId: video.id },
        }));

        const polarTask = polar.customers.delete({
          id: deletedUser.polarCustomerId,
        });

        const triggerTask = tasks.batchTrigger<typeof videoDeletionTask>(
          "video-deletion",
          videoDeletionTasks
        );

        await Promise.all([polarTask, triggerTask]);
      }
    } else if (event.type === "user.updated") {
      const userPrimaryEmail = event.data.email_addresses.find(
        (e) => e.id === event.data.primary_email_address_id
      );

      if (!userPrimaryEmail) {
        return new Response("Error occured - no user primary email", {
          status: 400,
        });
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          email: userPrimaryEmail.email_address,
        })
        .where(eq(users.id, event.data.id))
        .returning();

      await polar.customers.update({
        id: updatedUser.polarCustomerId,
        customerUpdate: {
          email: userPrimaryEmail.email_address,
        },
      });
    }

    return json({ success: true });
  },
});
