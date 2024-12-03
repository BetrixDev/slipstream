import { env } from "@/env";
import { clerkClient } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { Redis } from "@upstash/redis";
import { FREE_PLAN_VIDEO_RETENION_DAYS, PLAN_STORAGE_SIZES } from "cms";
import { db, users, eq, videos, sql } from "db";
import { headers } from "next/headers";
import Stripe from "stripe";
import type { videoDeletionTask } from "trigger";

const redis = new Redis({
  url: process.env.REDIS_REST_URL,
  token: process.env.REDIS_REST_TOKEN,
});

const PRODUCT_IDS: Record<string, string> = {
  [env.PRO_PRODUCT_ID]: "pro",
  [env.PREMIUM_PRODUCT_ID]: "premium",
};

export async function POST(request: Request) {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  const sig = (await headers()).get("stripe-signature");

  if (!sig) {
    return new Response("No stripe signature", {
      status: 400,
    });
  }

  let event: Stripe.Event;

  const payload = await request.text();

  try {
    event = stripe.webhooks.constructEvent(payload, sig, env.STRIPE_SIGNING_SECRET);
  } catch (err) {
    return new Response((err as Error).message, {
      status: 400,
    });
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.resumed"
  ) {
    const product = event.data.object.items.data.find((item) => {
      return PRODUCT_IDS[item.plan.product as string] !== undefined;
    });

    if (product === undefined) {
      return new Response("Cant find product", { status: 404 });
    }

    const productName = PRODUCT_IDS[product.plan.product as string];

    const customerData = await stripe.customers.retrieve(event.data.object.customer as string);

    if (customerData.deleted) {
      return new Response("Customer is deleted", { status: 500 });
    }

    const customerEmail = customerData.email;

    if (customerEmail === null) {
      return new Response("Customer doesn't have an email", { status: 400 });
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        accountTier: productName as any,
      })
      .where(eq(users.email, customerEmail))
      .returning();

    await Promise.all([
      redis.del(`videos:${updatedUser.id}`),
      db.update(videos).set({ deletionDate: null }).where(eq(videos.authorId, updatedUser.id)),
      clerkClient().then((clerk) =>
        clerk.users.updateUserMetadata(updatedUser.id, {
          publicMetadata: {
            accountTier: productName,
          },
        }),
      ),
    ]);

    return new Response("", { status: 200 });
  } else if (
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.paused"
  ) {
    const customerData = await stripe.customers.retrieve(event.data.object.customer as string);

    if (customerData.deleted) {
      return new Response("", { status: 500 });
    }

    const customerEmail = customerData.email;

    if (customerEmail === null) {
      return new Response("Customer is deleted", { status: 400 });
    }

    const userData = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, customerEmail),
      with: {
        videos: {
          orderBy: (table, { asc }) => asc(table.createdAt),
        },
      },
    });

    if (!userData) {
      return new Response("", { status: 401 });
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
      redis.del(`videos:${userData.id}`),
    ]);

    return new Response("", { status: 200 });
  }

  return new Response(`No event handler for ${event.type}`, { status: 404 });
}
