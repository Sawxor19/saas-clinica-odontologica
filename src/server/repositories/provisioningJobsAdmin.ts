import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type ProvisioningJobStatus =
  | "received"
  | "user_ok"
  | "profile_ok"
  | "clinic_ok"
  | "membership_ok"
  | "subscription_ok"
  | "done"
  | "failed";

export type ProvisioningJob = {
  job_id: string;
  stripe_event_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  intent_id: string | null;
  user_id: string | null;
  clinic_id: string | null;
  status: ProvisioningJobStatus;
  error_message: string | null;
  payload_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type EnsureProvisioningJobInput = {
  stripeEventId?: string | null;
  checkoutSessionId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  intentId?: string | null;
  userId?: string | null;
  clinicId?: string | null;
  payload?: Record<string, unknown> | null;
};

function isUniqueViolation(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}

export async function ensureProvisioningJob(
  input: EnsureProvisioningJobInput
): Promise<ProvisioningJob> {
  const admin = supabaseAdmin();
  const now = new Date().toISOString();
  const basePayload = {
    stripe_event_id: input.stripeEventId ?? null,
    stripe_checkout_session_id: input.checkoutSessionId ?? null,
    stripe_customer_id: input.stripeCustomerId ?? null,
    stripe_subscription_id: input.stripeSubscriptionId ?? null,
    intent_id: input.intentId ?? null,
    user_id: input.userId ?? null,
    clinic_id: input.clinicId ?? null,
    status: "received" as ProvisioningJobStatus,
    error_message: null,
    payload_json: input.payload ?? null,
    updated_at: now,
  };

  if (!input.stripeEventId) {
    const { data, error } = await admin
      .from("provisioning_jobs")
      .insert(basePayload)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message || "Failed to create provisioning job");
    }
    return data as ProvisioningJob;
  }

  const { data, error } = await admin
    .from("provisioning_jobs")
    .insert(basePayload)
    .select("*")
    .single();

  if (!error && data) {
    return data as ProvisioningJob;
  }

  if (!isUniqueViolation(error)) {
    throw new Error(error?.message || "Failed to create provisioning job");
  }

  const { data: existing, error: existingError } = await admin
    .from("provisioning_jobs")
    .select("*")
    .eq("stripe_event_id", input.stripeEventId)
    .maybeSingle();

  if (existingError || !existing) {
    throw new Error(existingError?.message || "Provisioning job not found");
  }

  const { data: updated, error: updateError } = await admin
    .from("provisioning_jobs")
    .update({
      ...basePayload,
      status:
        existing.status === "done"
          ? ("done" as ProvisioningJobStatus)
          : ("received" as ProvisioningJobStatus),
    })
    .eq("job_id", existing.job_id)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || "Failed to update provisioning job");
  }

  return updated as ProvisioningJob;
}

export async function getProvisioningJobById(jobId: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("provisioning_jobs")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return (data as ProvisioningJob | null) ?? null;
}

export async function updateProvisioningJob(
  jobId: string,
  patch: Partial<{
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    intentId: string | null;
    userId: string | null;
    clinicId: string | null;
    status: ProvisioningJobStatus;
    errorMessage: string | null;
    payload: Record<string, unknown> | null;
  }>
) {
  const admin = supabaseAdmin();
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.stripeCustomerId !== undefined) {
    updatePayload.stripe_customer_id = patch.stripeCustomerId;
  }
  if (patch.stripeSubscriptionId !== undefined) {
    updatePayload.stripe_subscription_id = patch.stripeSubscriptionId;
  }
  if (patch.intentId !== undefined) {
    updatePayload.intent_id = patch.intentId;
  }
  if (patch.userId !== undefined) {
    updatePayload.user_id = patch.userId;
  }
  if (patch.clinicId !== undefined) {
    updatePayload.clinic_id = patch.clinicId;
  }
  if (patch.status !== undefined) {
    updatePayload.status = patch.status;
  }
  if (patch.errorMessage !== undefined) {
    updatePayload.error_message = patch.errorMessage;
  }
  if (patch.payload !== undefined) {
    updatePayload.payload_json = patch.payload;
  }

  const { data, error } = await admin
    .from("provisioning_jobs")
    .update(updatePayload)
    .eq("job_id", jobId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to update provisioning job");
  }
  return data as ProvisioningJob;
}

export async function setProvisioningJobStep(
  jobId: string,
  status: ProvisioningJobStatus,
  patch?: Partial<{
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    intentId: string | null;
    userId: string | null;
    clinicId: string | null;
    payload: Record<string, unknown> | null;
  }>
) {
  return updateProvisioningJob(jobId, {
    status,
    errorMessage: null,
    stripeCustomerId: patch?.stripeCustomerId,
    stripeSubscriptionId: patch?.stripeSubscriptionId,
    intentId: patch?.intentId,
    userId: patch?.userId,
    clinicId: patch?.clinicId,
    payload: patch?.payload,
  });
}

export async function failProvisioningJob(
  jobId: string,
  message: string,
  patch?: Partial<{
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    intentId: string | null;
    userId: string | null;
    clinicId: string | null;
    payload: Record<string, unknown> | null;
  }>
) {
  return updateProvisioningJob(jobId, {
    status: "failed",
    errorMessage: message,
    stripeCustomerId: patch?.stripeCustomerId,
    stripeSubscriptionId: patch?.stripeSubscriptionId,
    intentId: patch?.intentId,
    userId: patch?.userId,
    clinicId: patch?.clinicId,
    payload: patch?.payload,
  });
}

export async function findProvisioningJobBySessionOrIntent(input: {
  checkoutSessionId?: string | null;
  intentId?: string | null;
}) {
  const admin = supabaseAdmin();

  if (input.checkoutSessionId) {
    const { data, error } = await admin
      .from("provisioning_jobs")
      .select("*")
      .eq("stripe_checkout_session_id", input.checkoutSessionId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as ProvisioningJob;
  }

  if (input.intentId) {
    const { data, error } = await admin
      .from("provisioning_jobs")
      .select("*")
      .eq("intent_id", input.intentId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as ProvisioningJob;
  }

  return null;
}
