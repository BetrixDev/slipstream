import { Webhook } from "standardwebhooks";

import type {
  WebhookCheckoutCreatedPayload,
  WebhookCheckoutUpdatedPayload,
  WebhookSubscriptionActivePayload,
  WebhookSubscriptionCanceledPayload,
  WebhookSubscriptionCreatedPayload,
  WebhookSubscriptionRevokedPayload,
  WebhookSubscriptionUpdatedPayload,
} from "@polar-sh/sdk/models/components";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db, eq, or, sql, users, videos } from "db";
import { clerkClient } from "@clerk/nextjs/server";
import { FREE_PLAN_VIDEO_RETENION_DAYS, PLAN_STORAGE_SIZES } from "cms";
import { tasks } from "@trigger.dev/sdk/v3";
import { Redis } from "@upstash/redis";
import { type videoDeletionTask } from "trigger";

type WebhookEvent =
  | WebhookCheckoutCreatedPayload
  | WebhookCheckoutUpdatedPayload
  | WebhookSubscriptionCreatedPayload
  | WebhookSubscriptionActivePayload
  | WebhookSubscriptionCanceledPayload
  | WebhookSubscriptionUpdatedPayload
  | WebhookSubscriptionRevokedPayload;

const redis = new Redis({
  url: process.env.REDIS_REST_URL,
  token: process.env.REDIS_REST_TOKEN,
});

export async function POST(request: NextRequest) {
  const requestBody = await request.text();

  const webhookHeaders = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };

  const webhookSecret = Buffer.from(env.POLAR_WEBHOOK_SECRET).toString("base64");
  const wh = new Webhook(webhookSecret);
  const webhookPayload = wh.verify(requestBody, webhookHeaders) as WebhookEvent;

  console.log("Incoming Webhook", webhookPayload.type);

  switch (webhookPayload.type) {
    case "checkout.created":
    case "checkout.updated":
      if (webhookPayload.data.customerEmail) {
        await db
          .update(users)
          .set({
            polarCustomerId: webhookPayload.data.customerId,
          })
          .where(eq(users.email, webhookPayload.data.customerEmail));
      }

      return NextResponse.json({
        received: true,
        success: true,
        userId: webhookPayload.data.customerId,
      });

    case "subscription.active":
      const productId =
        webhookPayload.data.product.metadata.productId ?? webhookPayload.data.productId;

      let [updatedUser] = await db
        .update(users)
        .set({
          accountTier: productId as any,
        })
        .where(eq(users.polarCustomerId, webhookPayload.data.userId))
        .returning();

      if (!updatedUser) {
        updatedUser = (
          await db
            .update(users)
            .set({
              accountTier: productId as any,
            })
            .where(eq(users.email, webhookPayload.data.user.email))
            .returning()
        )[0];
      }

      if (!updatedUser) {
        return new Response(`No user with polar customer id ${webhookPayload.data.userId} found`, {
          status: 404,
        });
      }

      await Promise.all([
        redis.del(`videos:${updatedUser.id}`).catch(() => {}),
        db.update(videos).set({ deletionDate: null }).where(eq(videos.authorId, updatedUser.id)),
        clerkClient().then((clerk) =>
          clerk.users.updateUserMetadata(updatedUser.id, {
            publicMetadata: {
              accountTier: productId,
            },
          }),
        ),
      ]);

      return NextResponse.json({
        received: true,
        success: true,
        userId: updatedUser.id,
      });

    case "subscription.revoked":
    case "subscription.canceled":
      let userData = await db.query.users.findFirst({
        where: (table, { eq }) => eq(table.polarCustomerId, webhookPayload.data.userId),
        with: {
          videos: {
            orderBy: (table, { asc }) => asc(table.createdAt),
          },
        },
      });

      if (!userData) {
        userData = await db.query.users.findFirst({
          where: (table, { eq }) => eq(table.email, webhookPayload.data.user.email),
          with: {
            videos: {
              orderBy: (table, { asc }) => asc(table.createdAt),
            },
          },
        });
      }

      if (!userData) {
        return new Response(`No user with polar customer id ${webhookPayload.data.userId} found`, {
          status: 404,
        });
      }

      await Promise.all([
        clerkClient().then((clerk) =>
          clerk.users.updateUserMetadata(userData.id, {
            publicMetadata: {
              accountTier: "free",
            },
          }),
        ),
        db
          .update(videos)
          .set({
            deletionDate: sql.raw(`now() + INTERVAL '${FREE_PLAN_VIDEO_RETENION_DAYS} days'`),
          })
          .execute(),
      ]);

      const currentAmountOfStorage = PLAN_STORAGE_SIZES[userData.accountTier];
      const futureAmountOfStorage = PLAN_STORAGE_SIZES["free"];

      const difference = Math.abs(currentAmountOfStorage - futureAmountOfStorage);
      let videoSizeDeleted = 0;

      const jobs: { payload: { videoId: string } }[] = [];

      for (const video of userData.videos) {
        if (videoSizeDeleted >= difference) {
          break;
        }

        videoSizeDeleted += video.fileSizeBytes;

        jobs.push({ payload: { videoId: video.id } });
      }

      await Promise.all([
        tasks.batchTrigger<typeof videoDeletionTask>("video-deletion", jobs),
        redis.del(`videos:${userData.id}`).catch(() => {}),
      ]);

      return NextResponse.json({
        received: true,
        success: true,
        userId: userData.id,
        videosScheduledForDeletion: jobs.length,
        storageFreed: videoSizeDeleted,
      });

    default:
      console.log(`Unhandled event type ${webhookPayload.type}`);
  }

  return NextResponse.json({ received: true });
}
