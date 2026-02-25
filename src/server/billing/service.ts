import type Stripe from "stripe";
import { stripe as stripeClient } from "@/server/billing/stripe";
import { PlanKey } from "@/server/billing/plans";
import { logger } from "@/lib/logger";
import { ensureReadyForCheckout } from "@/server/services/signup-intent.service";
import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { supabaseServerClient } from "@/server/db/supabaseServer";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { syncSubscriptionFromStripe } from "@/server/services/provisioning.service";
import { getAppUrl } from "@/server/config/app-url";

const SIGNUP_CHECKOUT_VERSION = "v3";

const planPriceMap: Record<PlanKey, string> = {
  trial: process.env.STRIPE_PRICE_TRIAL || "",
  monthly: process.env.STRIPE_PRICE_MONTHLY || "",
  quarterly: process.env.STRIPE_PRICE_QUARTERLY || "",
  semiannual: process.env.STRIPE_PRICE_SEMIANNUAL || "",
  annual: process.env.STRIPE_PRICE_ANNUAL || "",
};

export async function createCheckoutSessionForClinic(plan: PlanKey) {
  const priceId = planPriceMap[plan];
  if (!priceId) {
    throw new Error("Invalid Stripe price ID");
  }

  const { permissions, userId, clinicId } = await getClinicContext();
  assertPermission(permissions, "manageBilling");
  const appUrl = getAppUrl();

  const supabase = await supabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const { data: userData } = await supabase.auth.getUser();
    const customer = await stripeClient.customers.create({
      email: userData.user?.email ?? undefined,
      metadata: { clinic_id: clinicId },
    });
    customerId = customer.id;
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", userId);
  }

  const session = await stripeClient.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { plan },
    },
    metadata: {
      clinic_id: clinicId,
      plan,
      user_id: userId,
      checkout_kind: "clinic",
    },
    success_url: `${appUrl}/billing`,
    cancel_url: `${appUrl}/billing/plans`,
  });

  return session.url;
}

export async function createCheckoutSession(input: {
  intentId: string;
  plan: PlanKey;
}) {
  const priceId = planPriceMap[input.plan];
  if (!priceId) {
    throw new Error("Invalid Stripe price ID");
  }

  const intent = await ensureReadyForCheckout(input.intentId);
  const appUrl = getAppUrl();
  const admin = supabaseAdmin();
  const shouldApplyTrial = input.plan === "trial";

  if (intent.checkout_session_id) {
    try {
      const existing = await stripeClient.checkout.sessions.retrieve(
        intent.checkout_session_id
      );

      const existingPlan = existing.metadata?.plan;
      const existingVersion = existing.metadata?.checkout_version;
      const existingPriceId = existing.metadata?.price_id;
      const canReuseOpenSession =
        existing?.url &&
        existing.status === "open" &&
        existingPlan === input.plan &&
        existingVersion === SIGNUP_CHECKOUT_VERSION &&
        existingPriceId === priceId;

      if (canReuseOpenSession) {
        return existing.url;
      }

      if (existing?.status === "complete") {
        return `${appUrl}/signup/success?session_id=${existing.id}&intentId=${intent.id}`;
      }
    } catch (error) {
      logger.warn("Checkout session lookup failed", {
        intentId: intent.id,
        checkoutSessionId: intent.checkout_session_id,
        error: (error as Error).message,
      });
    }
  }

  const session = await stripeClient.checkout.sessions.create(
    {
      mode: "subscription",
      customer_email: intent.email,
      client_reference_id: intent.id,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_collection: "always",
      allow_promotion_codes: true,
      subscription_data: shouldApplyTrial
        ? {
            trial_period_days: 30,
            metadata: { plan: input.plan },
          }
        : {
            metadata: { plan: input.plan },
          },
      metadata: {
        intent_id: intent.id,
        plan: input.plan,
        price_id: priceId,
        user_id: intent.user_id || "",
        checkout_kind: "signup",
        checkout_version: SIGNUP_CHECKOUT_VERSION,
      },
      success_url: `${appUrl}/signup/success?session_id={CHECKOUT_SESSION_ID}&intentId=${intent.id}`,
      cancel_url: `${appUrl}/signup/cancelled?intentId=${intent.id}`,
    },
    {
      idempotencyKey: `signup_checkout_${SIGNUP_CHECKOUT_VERSION}:${intent.id}:${input.plan}:${priceId}`,
    }
  );

  await admin
    .from("signup_intents")
    .update({ checkout_session_id: session.id, updated_at: new Date().toISOString() })
    .eq("id", intent.id);

  return session.url;
}

export async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription) {
  await syncSubscriptionFromStripe(subscription);
}

export async function syncSubscriptionByCustomerId(customerId: string) {
  if (!customerId) return null;
  const subscriptions = await stripeClient.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
  });

  const latest = subscriptions.data[0];
  if (!latest) return null;

  await upsertSubscriptionFromStripe(latest);
  return latest;
}

export async function createBillingPortalSession() {
  const { permissions, userId, clinicId } = await getClinicContext();
  assertPermission(permissions, "manageBilling");
  const appUrl = getAppUrl();

  const supabase = await supabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const { data: userData } = await supabase.auth.getUser();
    const customer = await stripeClient.customers.create({
      email: userData.user?.email ?? undefined,
      metadata: { clinic_id: clinicId },
    });
    customerId = customer.id;
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", userId);
  }

  const session = await stripeClient.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/billing`,
  });

  return session.url;
}

export async function cancelSubscriptionForClinic(options?: { atPeriodEnd?: boolean }) {
  const { permissions, clinicId } = await getClinicContext();
  assertPermission(permissions, "manageBilling");

  const supabase = await supabaseServerClient();
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("clinic_id", clinicId)
    .single();

  if (error || !subscription?.stripe_subscription_id) {
    throw new Error("Subscription not found");
  }

  if (subscription.status === "canceled") {
    return;
  }

  const atPeriodEnd = options?.atPeriodEnd ?? true;
  if (atPeriodEnd) {
    await stripeClient.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    return;
  }

  await stripeClient.subscriptions.cancel(subscription.stripe_subscription_id);
}
