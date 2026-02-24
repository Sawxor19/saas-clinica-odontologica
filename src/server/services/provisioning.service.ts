import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { stripe } from "@/server/billing/stripe";
import { PlanKey, planDays } from "@/server/billing/plans";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { auditLogAdmin } from "@/server/audit/auditLog";
import {
  ensureProvisioningJob,
  failProvisioningJob,
  findProvisioningJobBySessionOrIntent,
  getProvisioningJobById,
  ProvisioningJob,
  setProvisioningJobStep,
} from "@/server/repositories/provisioningJobsAdmin";
import {
  markWebhookEventFailed,
  markWebhookEventProcessed,
  reserveWebhookEvent,
} from "@/server/repositories/webhookEventsAdmin";

const ACTIVE_ACCESS_STATUSES = new Set(["active", "trialing"]);
const PLAN_VALUES: PlanKey[] = [
  "trial",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
];

type SignupIntentRecord = {
  id: string;
  clinic_name: string | null;
  admin_name: string | null;
  email: string | null;
  whatsapp_number: string | null;
  phone_e164: string | null;
  phone_verified_at: string | null;
  cpf_hash: string | null;
  plan: string | null;
  user_id: string | null;
  status: string | null;
  clinic_id: string | null;
};

type ReprocessCaller =
  | { mode: "service" }
  | { mode: "admin"; actorClinicId: string; actorRole: string };

function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizePlan(value: unknown, fallback: PlanKey = "monthly"): PlanKey {
  const plan = asString(value);
  if (!plan) return fallback;
  return PLAN_VALUES.includes(plan as PlanKey) ? (plan as PlanKey) : fallback;
}

function fallbackPeriodEnd(plan: PlanKey) {
  return new Date(Date.now() + planDays[plan] * 24 * 60 * 60 * 1000).toISOString();
}

function getSessionProvisionStatus(session: Stripe.Checkout.Session) {
  if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
    return "active";
  }
  if (session.status === "complete") {
    return "active";
  }
  return "incomplete";
}

async function getSignupIntent(intentId: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("signup_intents")
    .select(
      "id, clinic_name, admin_name, email, whatsapp_number, phone_e164, phone_verified_at, cpf_hash, plan, user_id, status, clinic_id"
    )
    .eq("id", intentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as SignupIntentRecord | null) ?? null;
}

async function resolveClinicIdByCustomerId(customerId: string) {
  const admin = supabaseAdmin();
  const { data: bySubscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("clinic_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (subscriptionError) {
    throw new Error(subscriptionError.message);
  }

  if (bySubscription?.clinic_id) {
    return bySubscription.clinic_id as string;
  }

  const { data: byProfile, error: profileError } = await admin
    .from("profiles")
    .select("clinic_id")
    .eq("stripe_customer_id", customerId)
    .eq("role", "admin")
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  return (byProfile?.clinic_id as string | null) ?? null;
}

async function upsertSubscriptionRecord(input: {
  clinicId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: PlanKey;
  status: string;
  currentPeriodEnd: string;
}) {
  const admin = supabaseAdmin();
  const now = new Date().toISOString();

  const { error: subscriptionError } = await admin.from("subscriptions").upsert(
    {
      clinic_id: input.clinicId,
      stripe_customer_id: input.stripeCustomerId,
      stripe_subscription_id: input.stripeSubscriptionId,
      plan: input.plan,
      status: input.status,
      current_period_end: input.currentPeriodEnd,
      updated_at: now,
    },
    { onConflict: "clinic_id" }
  );

  if (subscriptionError) {
    throw new Error(subscriptionError.message);
  }

  const { error: clinicError } = await admin
    .from("clinics")
    .update({
      subscription_status: input.status,
      current_period_end: input.currentPeriodEnd,
    })
    .eq("id", input.clinicId);

  if (clinicError) {
    throw new Error(clinicError.message);
  }

  if (input.stripeCustomerId) {
    await admin
      .from("profiles")
      .update({ stripe_customer_id: input.stripeCustomerId })
      .eq("clinic_id", input.clinicId)
      .eq("role", "admin");
  }
}

async function getAdminActorForClinic(clinicId: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("profiles")
    .select("user_id")
    .eq("clinic_id", clinicId)
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return asString(data?.user_id);
}

async function auditBillingEvent(input: {
  clinicId: string;
  action: string;
  entity: "subscription" | "payment";
  metadata: Record<string, unknown>;
}) {
  const actorUserId = await getAdminActorForClinic(input.clinicId);
  if (!actorUserId) return;
  await auditLogAdmin({
    clinicId: input.clinicId,
    userId: actorUserId,
    action: input.action,
    entity: input.entity,
    metadata: input.metadata,
  });
}

async function provisionCheckoutSession(input: {
  session: Stripe.Checkout.Session;
  stripeEventId?: string | null;
  forcedJobId?: string | null;
}) {
  const { session, stripeEventId } = input;
  const stripeCustomerId = asString(session.customer);
  const stripeSubscriptionId = asString(session.subscription);
  const intentId = asString(session.metadata?.intent_id);
  const metadataUserId = asString(session.metadata?.user_id);
  const metadataClinicId = asString(session.metadata?.clinic_id);
  const payload = {
    source: "stripe.checkout.session.completed",
    session,
  };

  let job: ProvisioningJob;
  if (input.forcedJobId) {
    const existing = await getProvisioningJobById(input.forcedJobId);
    if (!existing) {
      throw new Error("Provisioning job not found");
    }
    job = existing;
  } else {
    job = await ensureProvisioningJob({
      stripeEventId,
      checkoutSessionId: session.id,
      stripeCustomerId,
      stripeSubscriptionId,
      intentId,
      payload,
    });
  }

  if (job.status === "done") {
    logger.info("Provisioning already completed", {
      jobId: job.job_id,
      stripeEventId,
      checkoutSessionId: session.id,
    });
    return job;
  }

  await setProvisioningJobStep(job.job_id, "received", {
    stripeCustomerId,
    stripeSubscriptionId,
    intentId,
    payload,
  });

  let intent: SignupIntentRecord | null = null;
  let userId: string | null = null;
  let clinicId: string | null = null;

  try {
    const admin = supabaseAdmin();

    if (intentId) {
      intent = await getSignupIntent(intentId);
      if (!intent) {
        throw new Error(`Signup intent not found for ${intentId}`);
      }
    }

    userId = metadataUserId ?? intent?.user_id ?? null;
    if (!userId) {
      throw new Error("Provisioning aborted: missing user_id");
    }

    await setProvisioningJobStep(job.job_id, "user_ok", {
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      intentId,
      payload,
    });

    const { data: profile, error: profileReadError } = await admin
      .from("profiles")
      .select("clinic_id, role, full_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileReadError) {
      throw new Error(profileReadError.message);
    }

    clinicId = metadataClinicId ?? profile?.clinic_id ?? intent?.clinic_id ?? null;

    if (!clinicId) {
      const { data: ownerClinic, error: ownerClinicError } = await admin
        .from("clinics")
        .select("id")
        .eq("owner_user_id", userId)
        .maybeSingle();

      if (ownerClinicError) {
        throw new Error(ownerClinicError.message);
      }
      clinicId = asString(ownerClinic?.id);
    }

    if (!clinicId) {
      const plan = normalizePlan(session.metadata?.plan ?? intent?.plan, "monthly");
      const { data: clinic, error: clinicError } = await admin
        .from("clinics")
        .upsert(
          {
            owner_user_id: userId,
            name: intent?.clinic_name || "Clinic",
            whatsapp_number: intent?.whatsapp_number ?? intent?.phone_e164 ?? null,
            subscription_status: "inactive",
            current_period_end: fallbackPeriodEnd(plan),
          },
          { onConflict: "owner_user_id" }
        )
        .select("id")
        .single();

      if (clinicError || !clinic) {
        throw new Error(clinicError?.message || "Failed to create clinic");
      }

      clinicId = clinic.id as string;
    } else {
      await admin
        .from("clinics")
        .update({ owner_user_id: userId })
        .eq("id", clinicId)
        .is("owner_user_id", null);
    }

    await setProvisioningJobStep(job.job_id, "clinic_ok", {
      clinicId,
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      intentId,
      payload,
    });

    const role = profile?.role || "admin";
    const fullName =
      profile?.full_name ||
      intent?.admin_name ||
      session.customer_details?.name ||
      session.customer_email ||
      intent?.email ||
      "Admin";

    const { error: profileWriteError } = await admin.from("profiles").upsert(
      {
        user_id: userId,
        clinic_id: clinicId,
        full_name: fullName,
        role,
        stripe_customer_id: stripeCustomerId,
        cpf_hash: intent?.cpf_hash ?? null,
        phone_e164: intent?.phone_e164 ?? null,
        phone_verified_at: intent?.phone_verified_at ?? null,
      },
      { onConflict: "user_id" }
    );

    if (profileWriteError) {
      throw new Error(profileWriteError.message);
    }

    await setProvisioningJobStep(job.job_id, "profile_ok", {
      clinicId,
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      intentId,
      payload,
    });

    const { error: membershipError } = await admin.from("memberships").upsert(
      {
        clinic_id: clinicId,
        user_id: userId,
        role,
      },
      { onConflict: "clinic_id,user_id" }
    );

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    await setProvisioningJobStep(job.job_id, "membership_ok", {
      clinicId,
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      intentId,
      payload,
    });

    let stripeSubscription: Stripe.Subscription | null = null;
    if (stripeSubscriptionId) {
      stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    }

    const plan = normalizePlan(
      stripeSubscription?.metadata?.plan ??
        session.metadata?.plan ??
        intent?.plan ??
        "monthly",
      "monthly"
    );
    const status = stripeSubscription?.status || getSessionProvisionStatus(session);
    const periodEnd = stripeSubscription
      ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
      : fallbackPeriodEnd(plan);

    await upsertSubscriptionRecord({
      clinicId,
      stripeCustomerId,
      stripeSubscriptionId,
      plan,
      status,
      currentPeriodEnd: periodEnd,
    });

    await setProvisioningJobStep(job.job_id, "subscription_ok", {
      clinicId,
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      intentId,
      payload,
    });

    if (intentId) {
      const { error: intentUpdateError } = await admin
        .from("signup_intents")
        .update({
          status: "CONVERTED",
          clinic_id: clinicId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", intentId);

      if (intentUpdateError) {
        throw new Error(intentUpdateError.message);
      }
    }

    const doneJob = await setProvisioningJobStep(job.job_id, "done", {
      clinicId,
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      intentId,
      payload,
    });

    logger.info("Provisioning completed", {
      jobId: doneJob.job_id,
      stripeEventId,
      checkoutSessionId: session.id,
      clinicId,
      userId,
    });

    return doneJob;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown provisioning error";
    await failProvisioningJob(job.job_id, message, {
      clinicId,
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      intentId,
      payload,
    });
    logger.error("Provisioning failed", {
      jobId: job.job_id,
      stripeEventId,
      checkoutSessionId: session.id,
      error: message,
    });
    throw error;
  }
}

export async function syncSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const customerId = asString(subscription.customer);
  if (!customerId) return;

  const clinicId =
    asString(subscription.metadata?.clinic_id) ||
    (await resolveClinicIdByCustomerId(customerId));

  if (!clinicId) {
    logger.warn("Unable to match subscription customer to clinic", {
      customerId,
      subscriptionId: subscription.id,
    });
    return;
  }

  const plan = normalizePlan(subscription.metadata?.plan, "monthly");
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  await upsertSubscriptionRecord({
    clinicId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    plan,
    status: subscription.status,
    currentPeriodEnd: periodEnd,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = asString(invoice.customer);
  const subscriptionId = asString(invoice.subscription);

  if (subscriptionId) {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscriptionFromStripe(stripeSubscription);
  }

  if (!customerId) return;

  const clinicId = await resolveClinicIdByCustomerId(customerId);
  if (!clinicId) {
    logger.warn("invoice.paid without clinic mapping", {
      invoiceId: invoice.id,
      customerId,
    });
    return;
  }

  const paidAt = invoice.status_transitions.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
    : new Date().toISOString();

  const admin = supabaseAdmin();
  const { error } = await admin.from("payments_history").upsert(
    {
      clinic_id: clinicId,
      amount: invoice.amount_paid / 100,
      stripe_invoice_id: invoice.id,
      paid_at: paidAt,
    },
    { onConflict: "stripe_invoice_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  await auditBillingEvent({
    clinicId,
    action: "billing.invoice.paid",
    entity: "payment",
    metadata: {
      invoiceId: invoice.id,
      subscriptionId,
      amountPaid: invoice.amount_paid / 100,
    },
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = asString(invoice.subscription);
  const customerId = asString(invoice.customer);

  if (!subscriptionId) return;

  const current = await stripe.subscriptions.retrieve(subscriptionId);
  const finalSubscription =
    current.status === "canceled"
      ? current
      : await stripe.subscriptions.cancel(subscriptionId);

  await syncSubscriptionFromStripe(finalSubscription);

  if (!customerId) return;
  const clinicId = await resolveClinicIdByCustomerId(customerId);
  if (!clinicId) return;

  await auditBillingEvent({
    clinicId,
    action: "billing.invoice.payment_failed",
    entity: "subscription",
    metadata: {
      invoiceId: invoice.id,
      subscriptionId,
      status: finalSubscription.status,
    },
  });
}

export async function processStripeWebhookEvent(event: Stripe.Event) {
  const reservation = await reserveWebhookEvent(event);
  if (!reservation.shouldProcess) {
    logger.info("Stripe webhook skipped (idempotent)", {
      eventId: event.id,
      type: event.type,
      status: reservation.status,
    });
    return { skipped: true };
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const job = await provisionCheckoutSession({
          session,
          stripeEventId: event.id,
        });

        if (job.clinic_id) {
          await auditBillingEvent({
            clinicId: job.clinic_id,
            action: "billing.checkout.completed",
            entity: "subscription",
            metadata: {
              eventId: event.id,
              sessionId: session.id,
              provisioningJobId: job.job_id,
            },
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe(subscription);
        const customerId = asString(subscription.customer);
        const clinicId = customerId
          ? await resolveClinicIdByCustomerId(customerId)
          : null;
        if (clinicId) {
          await auditBillingEvent({
            clinicId,
            action:
              event.type === "customer.subscription.deleted"
                ? "billing.subscription.deleted"
                : "billing.subscription.updated",
            entity: "subscription",
            metadata: {
              eventId: event.id,
              subscriptionId: subscription.id,
              status: subscription.status,
            },
          });
        }
        break;
      }
      case "invoice.paid": {
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      }
      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      }
      default:
        logger.info("Stripe webhook event ignored", {
          eventId: event.id,
          type: event.type,
        });
    }

    await markWebhookEventProcessed(event.id);
    return { skipped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unhandled webhook error";
    await markWebhookEventFailed(event.id, message);
    throw error;
  }
}

function extractSessionFromPayload(payload: Record<string, unknown> | null) {
  if (!payload) return null;
  const possibleSession = payload.session as Stripe.Checkout.Session | undefined;
  if (possibleSession?.id) return possibleSession;
  const fallback = payload as unknown as Stripe.Checkout.Session;
  return fallback?.id ? fallback : null;
}

function assertReprocessPermission(job: ProvisioningJob, caller: ReprocessCaller) {
  if (caller.mode === "service") {
    return;
  }

  if (caller.actorRole !== "admin") {
    throw new Error("Only admin can reprocess provisioning jobs");
  }

  if (!job.clinic_id) {
    throw new Error("Job without clinic binding can only be reprocessed in service mode");
  }

  if (caller.actorClinicId !== job.clinic_id) {
    throw new Error("Admin can only reprocess jobs from own clinic");
  }
}

export async function reprocessJob(jobId: string, caller: ReprocessCaller) {
  const job = await getProvisioningJobById(jobId);
  if (!job) {
    throw new Error("Provisioning job not found");
  }

  assertReprocessPermission(job, caller);
  const session = extractSessionFromPayload(job.payload_json);

  if (!session) {
    throw new Error("Provisioning payload does not contain checkout session data");
  }

  return provisionCheckoutSession({
    session,
    stripeEventId: job.stripe_event_id,
    forcedJobId: job.job_id,
  });
}

export async function getProvisioningStatus(input: {
  checkoutSessionId?: string | null;
  intentId?: string | null;
}) {
  const admin = supabaseAdmin();
  const job = await findProvisioningJobBySessionOrIntent({
    checkoutSessionId: input.checkoutSessionId,
    intentId: input.intentId,
  });

  let clinicId = job?.clinic_id ?? null;
  if (!clinicId && input.intentId) {
    const { data: intent, error: intentError } = await admin
      .from("signup_intents")
      .select("clinic_id")
      .eq("id", input.intentId)
      .maybeSingle();

    if (intentError) {
      throw new Error(intentError.message);
    }

    clinicId = asString(intent?.clinic_id);
  }

  let subscription:
    | {
        status: string;
        current_period_end: string | null;
      }
    | null = null;

  if (clinicId) {
    const { data, error } = await admin
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      subscription = {
        status: data.status as string,
        current_period_end: data.current_period_end as string | null,
      };
    }
  }

  const ready =
    job?.status === "done" || Boolean(subscription && ACTIVE_ACCESS_STATUSES.has(subscription.status));

  return {
    ready,
    job,
    subscription,
    clinicId,
  };
}
