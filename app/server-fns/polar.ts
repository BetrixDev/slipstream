import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getAuth } from "@clerk/tanstack-start/server";
import { Polar } from "@polar-sh/sdk";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { getWebRequest } from "@tanstack/start/server";
import { Redis } from "@upstash/redis";
import { eq } from "drizzle-orm";
import { z } from "zod";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});

const redis = new Redis({
  url: process.env.REDIS_REST_URL,
  token: process.env.REDIS_REST_TOKEN,
});

type Product = {
  id: string;
  nameId: string;
  name: string;
  prices: { id: string; interval: string }[];
};

const signInPricingRedirect = redirect({
  to: "/sign-in/$",
  params: {
    _splat: "?redirect_url=/pricing",
  },
});

export const getProductsServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const cachedProducts = await redis.get<Product[]>("polar:products");

  if (cachedProducts) {
    try {
      return cachedProducts;
    } catch (error) {
      console.error(error);
    }
  }

  const result = await polar.products.list({
    isArchived: false,
    isRecurring: true,
  });

  const products: Product[] = [];

  for await (const page of result) {
    page.result.items.forEach((p) => {
      const existingProduct = products.find((x) => {
        return x.nameId === p.metadata.productName;
      });

      if (!existingProduct) {
        products.push({
          id: p.id,
          nameId: p.metadata.productName?.toString(),
          name: p.name,
          prices: [
            {
              id: p.id,
              interval: p.prices[0].recurringInterval!.toString(),
            },
          ],
        });
      } else {
        if (p.prices.length > 0 && p.prices[0].recurringInterval) {
          existingProduct.prices.push({
            id: p.id,
            interval: p.prices[0].recurringInterval?.toString(),
          });
        }
      }
    });
  }

  try {
    await redis.set("polar:products", products, {
      ex: 60 * 60 * 24, // 1 day
    });
  } catch (error) {
    console.error(error);
  }

  return products;
});

export const getCheckoutUrlServerFn = createServerFn({
  method: "POST",
})
  .validator(
    z.object({
      interval: z.union([z.literal("month"), z.literal("year")]),
      productName: z.union([z.literal("pro"), z.literal("premium"), z.literal("ultimate")]),
    }),
  )
  .handler(async ({ data }) => {
    const { userId } = await getAuth(getWebRequest()!);

    if (!userId) {
      throw signInPricingRedirect;
    }

    const user = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.id, userId),
    });

    if (!user) {
      throw signInPricingRedirect;
    }

    let customerId = user.polarCustomerId;

    if (!customerId) {
      const customer = await polar.customers.create({
        email: user.email,
        metadata: {
          userId,
        },
      });

      await db
        .update(users)
        .set({
          polarCustomerId: customer.id,
        })
        .where(eq(users.id, userId));

      customerId = customer.id;
    }

    const products = await getProductsServerFn();

    const product = products.find((x) => x.nameId === data.productName);

    const selectedPrice = product?.prices.find((x) => x.interval === data.interval);

    if (!product || !selectedPrice) {
      throw new Error("Product not found");
    }

    const checkout = await polar.checkouts.create({
      productId: selectedPrice.id,
      customerId: customerId,
      customerEmail: user.email,
      successUrl: "https://www.slipstream.video/success",
    });

    return {
      url: checkout.url,
    };
  });

export const getCustomerPortalUrlServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const { userId } = await getAuth(getWebRequest()!);

  if (!userId) {
    throw signInPricingRedirect;
  }

  const user = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
  });

  if (!user) {
    throw signInPricingRedirect;
  }

  let customerId = user.polarCustomerId;

  // This is a rare case
  if (!customerId) {
    const customer = await polar.customers.create({
      email: user.email,
      metadata: {
        userId,
      },
    });

    await db
      .update(users)
      .set({
        polarCustomerId: customer.id,
      })
      .where(eq(users.id, userId));

    customerId = customer.id;
  }

  const portal = await polar.customerSessions.create({
    customerId,
  });

  return {
    url: portal.customerPortalUrl,
  };
});
