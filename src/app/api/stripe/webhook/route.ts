import { headers } from "next/headers";
import { stripe } from "@/server/billing/stripe";
import { logger } from "@/lib/logger";
import { processStripeWebhookEvent } from "@/server/services/provisioning.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  if (!webhookSecret) {
    logger.error("Missing STRIPE_WEBHOOK_SECRET");
    return new Response("Webhook not configured", { status: 500 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    logger.warn("Invalid Stripe webhook signature", {
      error: (error as Error).message,
    });
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    await processStripeWebhookEvent(event);
    return new Response("ok", { status: 200 });
  } catch (error) {
    logger.error("Stripe webhook processing error", {
      eventId: event.id,
      type: event.type,
      error: (error as Error).message,
    });
    return new Response("Webhook error", { status: 500 });
  }
}
