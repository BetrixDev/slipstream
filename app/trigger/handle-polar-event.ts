import { FREE_PLAN_VIDEO_RETENION_DAYS, PLAN_STORAGE_SIZES } from "@/lib/constants";
import { db } from "@/lib/db";
import { users, videos } from "@/lib/schema";
import { safeParseAccountTier } from "@/lib/utils";
import { createClerkClient } from "@clerk/backend";
import type { validateEvent } from "@polar-sh/sdk/webhooks";
import { AbortTaskRunError, logger, metadata, schemaTask, tasks } from "@trigger.dev/sdk/v3";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { videoDeletionTask } from "./video-deletion";

export const handlePolarEventTask = schemaTask({
  id: "handle-polar-event",
  schema: z.object({
    event: z.unknown().transform((val) => val as ReturnType<typeof validateEvent>),
  }),
  machine: {
    preset: "micro",
  },
  run: async ({ event }) => {
    metadata.set("progress", 0);

    const { env } = await import("../lib/env");

    const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

    if (event.type === "subscription.active") {
      logger.info("Subscription active");

      metadata.set("progress", 15);

      const user = await db.query.users.findFirst({
        where: (table, { eq }) => eq(table.polarCustomerId, event.data.customer.id),
        columns: {
          id: true,
          accountTier: true,
        },
      });

      metadata.set("progress", 33);

      if (!user) {
        throw new AbortTaskRunError("User not found");
      }

      const oldAccountTier = user.accountTier;
      const newAccountTier = safeParseAccountTier(event.data.product.metadata.productName);

      // biome-ignore lint/suspicious/noExplicitAny: drizzle has stricter types than we need for these batch calls
      const dbCalls: any[] = [
        db
          .update(users)
          .set({
            accountTier: newAccountTier,
          })
          .where(eq(users.id, user.id)),
      ];

      metadata.set("progress", 45);

      if (oldAccountTier === "free") {
        dbCalls.push(
          db.update(videos).set({ pendingDeletionDate: null }).where(eq(videos.authorId, user.id)),
        );
      }

      await Promise.all([
        clerk.users.updateUserMetadata(user.id, {
          publicMetadata: {
            accountTier: newAccountTier,
          },
        }),
        // @ts-expect-error drizzle has stricter types than we need for these batch calls
        db.batch(dbCalls),
      ]);

      metadata.set("progress", 70);
    } else if (event.type === "subscription.revoked") {
      logger.info("Subscription revoked");

      const user = await db.query.users.findFirst({
        where: (table, { eq }) => eq(table.polarCustomerId, event.data.customer.id),
        columns: {
          id: true,
          accountTier: true,
        },
        with: {
          videos: {
            orderBy: (table, { asc }) => asc(table.createdAt),
          },
        },
      });

      if (!user) {
        throw new AbortTaskRunError("User not found");
      }

      const currentAmountOfStorage = PLAN_STORAGE_SIZES[user.accountTier];
      const futureAmountOfStorage = PLAN_STORAGE_SIZES.free;

      const difference = Math.abs(currentAmountOfStorage - futureAmountOfStorage);
      let totalSizeRecovered = 0;

      const jobs: { payload: { videoId: string } }[] = [];

      if (difference > 0) {
        for (const video of user.videos) {
          if (totalSizeRecovered >= difference) {
            break;
          }

          totalSizeRecovered += video.fileSizeBytes;

          jobs.push({ payload: { videoId: video.id } });
        }
      }

      await Promise.all([
        tasks.batchTrigger<typeof videoDeletionTask>("video-deletion", jobs),
        db.batch([
          db
            .update(users)
            .set({
              accountTier: "free",
            })
            .where(eq(users.id, user.id)),
          db
            .update(videos)
            .set({
              pendingDeletionDate: sql.raw(
                `now() + INTERVAL '${FREE_PLAN_VIDEO_RETENION_DAYS} days'`,
              ),
            })
            .where(eq(videos.authorId, user.id)),
        ]),
        clerk.users.updateUserMetadata(user.id, {
          publicMetadata: {
            accountTier: "free",
          },
        }),
      ]);
    } else {
      throw new AbortTaskRunError("Unknown event type");
    }

    metadata.set("progress", 100);
  },
});
