import type Stripe from "stripe";
import { stripe as stripeClient } from "@/server/billing/stripe";
import { PlanKey, planDays } from "@/server/billing/plans";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { logger } from "@/lib/logger";
import {
  ensureReadyForCheckout,
  markSignupConverted,
} from "@/server/services/signup-intent.service";
import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { supabaseServerClient } from "@/server/db/supabaseServer";

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
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/plans`,
  });

  return session.url;
}

export async function handleClinicCheckoutCompleted(session: Stripe.Checkout.Session) {
  const clinicId = session.metadata?.clinic_id;
  const plan = (session.metadata?.plan || "monthly") as PlanKey;
  if (!clinicId || !session.customer) return;

  const subscriptionId = session.subscription as string | null;
  const subscription = subscriptionId
    ? await stripeClient.subscriptions.retrieve(subscriptionId)
    : null;
  const status = subscription?.status || "active";
  const periodEnd = subscription
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : new Date(Date.now() + planDays[plan] * 24 * 60 * 60 * 1000).toISOString();

  const admin = supabaseAdmin();
  await admin.from("subscriptions").upsert({
    clinic_id: clinicId,
    stripe_subscription_id: subscriptionId,
    plan,
    status,
    current_period_end: periodEnd,
  });

  await admin
    .from("clinics")
    .update({ subscription_status: status, current_period_end: periodEnd })
    .eq("id", clinicId);

  await admin
    .from("profiles")
    .update({ stripe_customer_id: session.customer })
    .eq("clinic_id", clinicId)
    .eq("role", "admin");
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

  const session = await stripeClient.checkout.sessions.create({
    mode: "subscription",
    customer_email: intent.email,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { plan: input.plan },
    },
    metadata: {
      intent_id: intent.id,
      plan: input.plan,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup/cancelled`,
  });

  const admin = supabaseAdmin();
  await admin
    .from("signup_intents")
    .update({ checkout_session_id: session.id, updated_at: new Date().toISOString() })
    .eq("id", intent.id);

  return session.url;
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const intentId = session.metadata?.intent_id;
  const plan = (session.metadata?.plan || "trial") as PlanKey;
  if (!intentId) return;

  const admin = supabaseAdmin();
  const { data: intent, error } = await admin
    .from("signup_intents")
    .select(
      "clinic_name, admin_name, email, whatsapp_number, phone_e164, phone_verified_at, cpf_hash, user_id, status"
    )
    .eq("id", intentId)
    .single();

  if (error || !intent) {
    logger.error("Signup intent not found", { intentId });
    return;
  }

  if (intent.status === "CONVERTED") {
    return;
  }

  const userId = intent.user_id;
  if (!userId) {
    logger.error("Signup intent missing user_id", { intentId });
    return;
  }

  const subscriptionId = session.subscription as string | null;
  const subscription = subscriptionId
    ? await stripeClient.subscriptions.retrieve(subscriptionId)
    : null;
  const status = subscription?.status || "active";
  const periodEnd = subscription
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : new Date(Date.now() + planDays[plan] * 24 * 60 * 60 * 1000).toISOString();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("clinic_id")
    .eq("user_id", userId)
    .single();

  let clinicId = existingProfile?.clinic_id ?? null;
  if (!clinicId) {
    const { data: clinic, error: clinicError } = await admin
      .from("clinics")
      .insert({
        name: intent.clinic_name || "Clínica",
        whatsapp_number: intent.whatsapp_number || intent.phone_e164,
        subscription_status: status,
        current_period_end: periodEnd,
      })
      .select("id")
      .single();

    if (clinicError || !clinic) {
      logger.error("Failed to create clinic", { error: clinicError?.message });
      return;
    }

    clinicId = clinic.id;

    const profileInsert = await admin.from("profiles").insert({
      user_id: userId,
      clinic_id: clinic.id,
      full_name: intent.admin_name || intent.email,
      role: "admin",
      stripe_customer_id: session.customer ?? null,
      cpf_hash: intent.cpf_hash,
      phone_e164: intent.phone_e164,
      phone_verified_at: intent.phone_verified_at,
    });

    if (profileInsert.error) {
      logger.error("Failed to create profile", { error: profileInsert.error.message });
      return;
    }
  } else {
    await admin
      .from("profiles")
      .update({
        stripe_customer_id: session.customer ?? null,
        cpf_hash: intent.cpf_hash,
        phone_e164: intent.phone_e164,
        phone_verified_at: intent.phone_verified_at,
      })
      .eq("user_id", userId);
  }

  await admin.from("subscriptions").upsert({
    clinic_id: clinicId,
    stripe_subscription_id: subscriptionId,
    plan,
    status,
    current_period_end: periodEnd,
  });

  await admin
    .from("clinics")
    .update({ subscription_status: status, current_period_end: periodEnd })
    .eq("id", clinicId);

  await markSignupConverted(intentId);
}

export async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const admin = supabaseAdmin();
  const customer = subscription.customer as string;

  const { data: profile } = await admin
    .from("profiles")
    .select("clinic_id")
    .eq("stripe_customer_id", customer)
    .single();

  if (!profile) return;

  await admin.from("subscriptions").upsert({
    clinic_id: profile.clinic_id,
    stripe_subscription_id: subscription.id,
    plan: subscription.metadata?.plan || "monthly",
    status: subscription.status,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  });

  await admin
    .from("clinics")
    .update({
      subscription_status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("id", profile.clinic_id);
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
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
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
