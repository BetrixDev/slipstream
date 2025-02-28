import { json } from "@tanstack/start";
import { createAPIFileRoute } from "@tanstack/start/api";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { getHeaders } from "@tanstack/start/server";
import { tasks } from "@trigger.dev/sdk/v3";
import type { handlePolarEventTask } from "@/trigger/handle-polar-event";

export const APIRoute = createAPIFileRoute("/api/wh/polar")({
  POST: async ({ request, params }) => {
    try {
      const event = validateEvent(
        await request.json(),
        getHeaders() as Record<string, string>,
        process.env.POLAR_WEBHOOK_SECRET ?? ""
      );

      if (
        event.type === "subscription.active" ||
        event.type === "subscription.revoked"
      ) {
        await tasks.trigger<typeof handlePolarEventTask>("handle-polar-event", {
          event,
        });
      }

      return json({ message: "Webhook received" });
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        return json(
          { message: "Webhook verification failed" },
          { status: 403 }
        );
      }

      console.error(error);

      return json({ message: "Unknown error" }, { status: 500 });
    }
  },
});
