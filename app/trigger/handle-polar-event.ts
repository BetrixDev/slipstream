import {
  AbortTaskRunError,
  logger,
  schemaTask,
  tasks,
} from "@trigger.dev/sdk/v3";
import { z } from "zod";
import type { validateEvent } from "@polar-sh/sdk/webhooks";
import { db } from "@/lib/db";
import { safeParseAccountTier } from "@/lib/utils";
import { clerkClient } from "@clerk/tanstack-start/server";
import { users, videos } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import {
  FREE_PLAN_VIDEO_RETENION_DAYS,
  PLAN_STORAGE_SIZES,
} from "@/lib/constants";
import type { videoDeletionTask } from "./video-deletion";

export const handlePolarEventTask = schemaTask({
  id: "handle-polar-event",
  schema: z.object({
    event: z
      .unknown()
      .transform((val) => val as ReturnType<typeof validateEvent>),
  }),
  run: async ({ event }) => {
    const clerk = clerkClient({});

    if (event.type === "subscription.active") {
      logger.info("Subscription active");

      const user = await db.query.users.findFirst({
        where: (table, { eq }) =>
          eq(table.polarCustomerId, event.data.customer.id),
        columns: {
          id: true,
          accountTier: true,
        },
      });

      if (!user) {
        throw new AbortTaskRunError("User not found");
      }

      const oldAccountTier = user.accountTier;
      const newAccountTier = safeParseAccountTier(
        event.data.product.metadata.productName
      );

      // biome-ignore lint/suspicious/noExplicitAny: drizzle has stricter types than we need for these batch calls
      const dbCalls: any[] = [
        db
          .update(users)
          .set({
            accountTier: newAccountTier,
          })
          .where(eq(users.id, user.id)),
      ];

      if (oldAccountTier === "free") {
        dbCalls.push(
          db
            .update(videos)
            .set({ pendingDeletionDate: null })
            .where(eq(videos.authorId, user.id))
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
    } else if (event.type === "subscription.revoked") {
      logger.info("Subscription revoked");

      const user = await db.query.users.findFirst({
        where: (table, { eq }) =>
          eq(table.polarCustomerId, event.data.customer.id),
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

      const difference = Math.abs(
        currentAmountOfStorage - futureAmountOfStorage
      );
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
                `now() + INTERVAL '${FREE_PLAN_VIDEO_RETENION_DAYS} days'`
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
  },
});
