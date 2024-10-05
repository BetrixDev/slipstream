import { ActionFunctionArgs } from "@vercel/remix";
import { env } from "env/web";
import Stripe from "stripe";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

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

  if (event.type === "customer.subscription.created") {
    console.log(event.data.object.customer.toString());
  }
}
