import { headers } from "next/headers";
import { stripe } from "@/server/billing/stripe";
import {
  handleCheckoutCompleted,
  handleClinicCheckoutCompleted,
  upsertSubscriptionFromStripe,
} from "@/server/billing/service";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { auditLogAdmin } from "@/server/audit/auditLog";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const headerList = await headers();
  const signature = headerList.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .single();

  if (existing) {
    return new Response("ok", { status: 200 });
  }

  await admin.from("stripe_events").insert({ id: event.id, type: event.type });

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object);
      await handleClinicCheckoutCompleted(event.data.object);
      const session = event.data.object;
      if (session.customer) {
        const { data: profile } = await admin
          .from("profiles")
          .select("clinic_id, user_id")
          .eq("stripe_customer_id", session.customer)
          .single();
        if (profile) {
          await auditLogAdmin({
            clinicId: profile.clinic_id,
            userId: profile.user_id,
            action: "billing.checkout.completed",
            entity: "subscription",
            metadata: { sessionId: session.id },
          });
        }
      }
    }

    if (event.type === "customer.subscription.updated") {
      await upsertSubscriptionFromStripe(event.data.object);
      const subscription = event.data.object;
      const customer = subscription.customer as string | null;
      if (customer) {
        const { data: profile } = await admin
          .from("profiles")
          .select("clinic_id, user_id")
          .eq("stripe_customer_id", customer)
          .single();
        if (profile) {
          await auditLogAdmin({
            clinicId: profile.clinic_id,
            userId: profile.user_id,
            action: "billing.subscription.updated",
            entity: "subscription",
            metadata: { subscriptionId: subscription.id, status: subscription.status },
          });
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      await upsertSubscriptionFromStripe(event.data.object);
      const subscription = event.data.object;
      const customer = subscription.customer as string | null;
      if (customer) {
        const { data: profile } = await admin
          .from("profiles")
          .select("clinic_id, user_id")
          .eq("stripe_customer_id", customer)
          .single();
        if (profile) {
          await auditLogAdmin({
            clinicId: profile.clinic_id,
            userId: profile.user_id,
            action: "billing.subscription.deleted",
            entity: "subscription",
            metadata: { subscriptionId: subscription.id, status: subscription.status },
          });
        }
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      const subscription = invoice.subscription as string | null;
      const customer = invoice.customer as string | null;

      if (customer && subscription) {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription);
        await upsertSubscriptionFromStripe(stripeSubscription);

        const { data: profile } = await admin
          .from("profiles")
          .select("clinic_id, user_id")
          .eq("stripe_customer_id", customer)
          .single();

        if (profile?.clinic_id) {
          const paidAt = invoice.status_transitions.paid_at
            ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
            : new Date().toISOString();
          await admin.from("payments_history").insert({
            clinic_id: profile.clinic_id,
            amount: invoice.amount_paid / 100,
            stripe_invoice_id: invoice.id,
            paid_at: paidAt,
          });
          await auditLogAdmin({
            clinicId: profile.clinic_id,
            userId: profile.user_id,
            action: "billing.invoice.paid",
            entity: "payment",
            metadata: { invoiceId: invoice.id, subscription },
          });
        }
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription as string | null;
      const customer = invoice.customer as string | null;

      if (subscriptionId) {
        const current = await stripe.subscriptions.retrieve(subscriptionId);
        const finalSubscription =
          current.status === "canceled"
            ? current
            : await stripe.subscriptions.cancel(subscriptionId);

        await upsertSubscriptionFromStripe(finalSubscription);

        if (customer) {
          const { data: profile } = await admin
            .from("profiles")
            .select("clinic_id, user_id")
            .eq("stripe_customer_id", customer)
            .single();

          if (profile) {
            await auditLogAdmin({
              clinicId: profile.clinic_id,
              userId: profile.user_id,
              action: "billing.invoice.payment_failed",
              entity: "subscription",
              metadata: { invoiceId: invoice.id, subscriptionId },
            });
          }
        }
      }
    }
  } catch (error) {
    logger.error("Stripe webhook error", { error: (error as Error).message });
    return new Response("Webhook error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
