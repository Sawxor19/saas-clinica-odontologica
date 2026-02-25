import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type BillingProfileRecord = {
  user_id: string;
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

export class BillingRepository {
  async getBillingProfile(userId: string) {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("profiles")
      .select(
        "user_id, stripe_customer_id, trial_used, trial_used_at, stripe_subscription_id, subscription_status, trial_end, current_period_end, cancel_at_period_end"
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
