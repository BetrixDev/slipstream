import { ActionFunctionArgs, json } from "@vercel/remix";
import { env } from "~/server/env";
import Stripe from "stripe";
import { logger } from "~/server/logger.server";
import { db, eq, users } from "db";
import { PLAN_STORAGE_SIZES } from "cms";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export const videoDeletionQueue = new Queue("{video-deletion}", {
  connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
});

const PRODUCT_IDS: Record<string, string> = {
  [env.PRO_PRODUCT_ID]: "pro",
  [env.PREMIUM_PRODUCT_ID]: "premium",
};

export async function action({ request }: ActionFunctionArgs) {
  const sig = request.headers.get("stripe-signature");

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

  const whLogger = logger.child({
    webhookId: event.id,
    eventType: event.type,
  });

  whLogger.info("Recieved new Stripe webhook", {
    eventType: event.type,
  });

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.resumed"
  ) {
    const product = event.data.object.items.data.find((item) => {
      return PRODUCT_IDS[item.plan.product as string] !== undefined;
    });

    if (product === undefined) {
      whLogger.error("Could not find applicable product for event");
      return json({ success: false }, { status: 404 });
    }

    const productName = PRODUCT_IDS[product.plan.product as string];

    const customerData = await stripe.customers.retrieve(event.data.object.customer as string);

    if (customerData.deleted) {
      whLogger.error("Customer was deleted", {
        customerId: event.data.object.customer,
      });
      return json({ success: false, message: "Customer was deleted" }, { status: 500 });
    }

    const customerEmail = customerData.email;

    if (customerEmail === null) {
      return json({ success: false, message: "Customer email is missing" }, { status: 400 });
    }

    await db
      .update(users)
      .set({
        accountTier: productName as any,
      })
      .where(eq(users.email, customerEmail));

    whLogger.info(
      `New subscription created for ${productName} on a ${product.plan.interval} basis`,
      {
        productName,
        interval: product.plan.interval,
        amount: product.plan.amount,
        currency: product.plan.currency,
        priceId: product.price.id,
        customerId: event.data.object.customer,
        customerEmail,
      },
    );

    return json({ success: true, message: "Event processing finished" }, { status: 200 });
  } else if (
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.paused"
  ) {
    const customerData = await stripe.customers.retrieve(event.data.object.customer as string);

    if (customerData.deleted) {
      whLogger.error("Customer was deleted", {
        customerId: event.data.object.customer,
      });
      return json({ success: false, message: "Customer was deleted" }, { status: 500 });
    }

    const customerEmail = customerData.email;

    if (customerEmail === null) {
      return json({ success: false, message: "Customer email is missing" }, { status: 400 });
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
      whLogger.error(`User not found with email ${customerEmail}`, {
        customerEmail,
      });
      return json({ sucess: false }, { status: 401 });
    }

    const currentAmountOfStorage = PLAN_STORAGE_SIZES[userData.accountTier];
    const futureAmountOfStorage = PLAN_STORAGE_SIZES["free"];

    const difference = Math.abs(currentAmountOfStorage - futureAmountOfStorage);
    let videoSizeDeleted = 0;

    const jobs: { name: string; data: { videoId: string } }[] = [];

    for (const video of userData.videos) {
      if (videoSizeDeleted >= difference) {
        break;
      }

      videoSizeDeleted += video.fileSizeBytes;

      jobs.push({ name: `video-deletion-${video.id}`, data: { videoId: video.id } });
    }

    await videoDeletionQueue.addBulk(jobs);
    return json({ success: true, message: "Event processing finished" }, { status: 200 });
  }

  return json({ success: false, message: "No event found" }, { status: 404 });
}
