import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type BillingProfileRecord = {
  user_id: string;
  clinic_id: string;
  stripe_customer_id: string | null;
  trial_used: boolean | null;
  trial_used_at: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

type SubscriptionPatch = {
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

function isUniqueViolation(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}

function isMissingOnConflictConstraintError(message?: string | null) {
  return (
    message?.toLowerCase().includes(
      "there is no unique or exclusion constraint matching the on conflict specification"
    ) ?? false
  );
}

export class BillingRepository {
  async getBillingProfile(userId: string) {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("profiles")
      .select(
        "user_id, clinic_id, stripe_customer_id, trial_used, trial_used_at, stripe_subscription_id, subscription_status, trial_end, current_period_end, cancel_at_period_end"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as BillingProfileRecord | null) ?? null;
  }

  async setStripeCustomerId(userId: string, stripeCustomerId: string) {
    const admin = supabaseAdmin();
    const { error } = await admin
      .from("profiles")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
  }

  async markTrialUsed(userId: string) {
    const admin = supabaseAdmin();
    const { error } = await admin
      .from("profiles")
      .update({
        trial_used: true,
        trial_used_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
  }

  async updateSubscriptionByUserId(userId: string, patch: SubscriptionPatch) {
    const admin = supabaseAdmin();
    const { error } = await admin.from("profiles").update(patch).eq("user_id", userId);

    if (error) throw new Error(error.message);
  }

  async findUserIdByStripeCustomerId(stripeCustomerId: string) {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("profiles")
      .select("user_id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data?.user_id as string | undefined) ?? null;
  }

  async findClinicIdByStripeCustomerId(stripeCustomerId: string) {
    const admin = supabaseAdmin();
    const { data: bySubscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .select("clinic_id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();

    if (subscriptionError) throw new Error(subscriptionError.message);
    if (bySubscription?.clinic_id) return bySubscription.clinic_id as string;

    const { data: byProfile, error: profileError } = await admin
      .from("profiles")
      .select("clinic_id")
      .eq("stripe_customer_id", stripeCustomerId)
      .eq("role", "admin")
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    return (byProfile?.clinic_id as string | undefined) ?? null;
  }

  async upsertPaymentHistory(input: {
    clinicId: string;
    amount: number;
    stripeInvoiceId: string;
    paidAt: string;
  }) {
    const admin = supabaseAdmin();
    const payload = {
      clinic_id: input.clinicId,
      amount: input.amount,
      stripe_invoice_id: input.stripeInvoiceId,
      paid_at: input.paidAt,
    };

    const { error: upsertError } = await admin
      .from("payments_history")
      .upsert(payload, { onConflict: "stripe_invoice_id" });

    if (!upsertError) return;
    if (!isMissingOnConflictConstraintError(upsertError.message)) {
      throw new Error(upsertError.message);
    }

    const { data: existing, error: existingError } = await admin
      .from("payments_history")
      .select("id")
      .eq("stripe_invoice_id", input.stripeInvoiceId)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);

    if (existing?.id) {
      const { error: updateError } = await admin
        .from("payments_history")
        .update(payload)
        .eq("id", existing.id);
      if (updateError) throw new Error(updateError.message);
      return;
    }

    const { error: insertError } = await admin.from("payments_history").insert(payload);
    if (insertError) {
      if (isUniqueViolation(insertError)) return;
      throw new Error(insertError.message);
    }
  }

  async hasProcessedStripeEvent(eventId: string) {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("processed_stripe_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return Boolean(data?.event_id);
  }

  async insertProcessedStripeEvent(eventId: string) {
    const admin = supabaseAdmin();
    const { error } = await admin.from("processed_stripe_events").insert({
      event_id: eventId,
    });

    if (!error) return "inserted" as const;
    if (isUniqueViolation(error)) return "duplicate" as const;
    throw new Error(error.message);
  }
}
