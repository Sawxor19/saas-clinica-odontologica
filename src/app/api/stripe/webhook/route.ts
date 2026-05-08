import type Stripe from "stripe";
import { headers } from "next/headers";
import { stripe } from "@/server/billing/stripe";
import { logger } from "@/lib/logger";
import { BillingService } from "@/services/BillingService";
import { BillingEmailService } from "@/services/BillingEmailService";
import { getEnv } from "@/server/config/env";
import {
  markWebhookEventFailed,
  markWebhookEventProcessed,
  reserveWebhookEvent,
} from "@/server/repositories/webhookEventsAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  let webhookSecret = "";

  try {
    webhookSecret = getEnv().STRIPE_WEBHOOK_SECRET;
  } catch (error) {
    logger.error("Invalid environment for Stripe webhook", {
      error: (error as Error).message,
    });
    return new Response("Webhook not configured", { status: 500 });
  }

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    logger.warn("Invalid Stripe webhook signature", {
      error: (error as Error).message,
    });
    return new Response("Invalid signature", { status: 400 });
  }

  const service = new BillingService();
  const emailService = new BillingEmailService();

  let reservation;
  try {
    reservation = await reserveWebhookEvent(event);
  } catch (error) {
    logger.error("Stripe webhook reservation error", {
      eventId: event.id,
      type: event.type,
      error: (error as Error).message,
    });
    return new Response("Webhook reservation failed", { status: 500 });
  }

  if (!reservation.shouldProcess) {
    return new Response("ok", { status: 200 });
  }

  try {
    const alreadyProcessed = await service.hasProcessedEvent(event.id);
    if (alreadyProcessed) {
      return new Response("ok", { status: 200 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await service.handleCheckoutSessionCompleted(session);
        await emailService.sendCheckoutConfirmation(session);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await service.handleInvoicePaid(invoice);
        await emailService.sendInvoiceReceipt(invoice);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await service.handleCustomerSubscriptionUpdatedOrDeleted(subscription);
        break;
      }
      default:
        break;
    }

    await service.markEventProcessed(event.id);
    await markWebhookEventProcessed(event.id);
    return new Response("ok", { status: 200 });
  } catch (error) {
    logger.error("Stripe webhook processing error", {
      eventId: event.id,
      type: event.type,
      error: (error as Error).message,
    });
    try {
      await markWebhookEventFailed(event.id, (error as Error).message);
    } catch (markError) {
      logger.error("Stripe webhook failure tracking error", {
        eventId: event.id,
        error: (markError as Error).message,
      });
    }
    return new Response("Webhook processing failed", { status: 500 });
  }
}
