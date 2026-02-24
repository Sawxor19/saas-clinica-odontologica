import type Stripe from "stripe";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type WebhookEventStatus =
  | "received"
  | "processing"
  | "processed"
  | "failed";

export type ReserveWebhookEventResult = {
  shouldProcess: boolean;
  isDuplicate: boolean;
  status: WebhookEventStatus;
};

function isUniqueViolation(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}

export async function reserveWebhookEvent(
  event: Stripe.Event
): Promise<ReserveWebhookEventResult> {
  const admin = supabaseAdmin();
  const now = new Date().toISOString();

  const { data: created, error: insertError } = await admin
    .from("webhook_events")
    .insert({
      event_id: event.id,
      event_type: event.type,
      status: "processing",
      payload_json: event,
      received_at: now,
      processing_started_at: now,
      last_seen_at: now,
      attempt_count: 1,
      updated_at: now,
    })
    .select("event_id, status, attempt_count")
    .single();

  if (!insertError && created) {
    return { shouldProcess: true, isDuplicate: false, status: "processing" };
  }

  if (!isUniqueViolation(insertError)) {
    throw new Error(insertError?.message || "Failed to reserve webhook event");
  }

  const { data: existing, error: existingError } = await admin
    .from("webhook_events")
    .select("event_id, status, attempt_count")
    .eq("event_id", event.id)
    .maybeSingle();

  if (existingError || !existing) {
    throw new Error(existingError?.message || "Webhook event not found");
  }

  const nextAttempt = (existing.attempt_count ?? 1) + 1;
  const baseUpdate = {
    last_seen_at: now,
    attempt_count: nextAttempt,
    updated_at: now,
  };

  if (existing.status === "processed" || existing.status === "processing") {
    await admin.from("webhook_events").update(baseUpdate).eq("event_id", event.id);
    return {
      shouldProcess: false,
      isDuplicate: true,
      status: existing.status,
    };
  }

  const { data: claimed, error: claimError } = await admin
    .from("webhook_events")
    .update({
      ...baseUpdate,
      event_type: event.type,
      status: "processing",
      payload_json: event,
      error_message: null,
      processing_started_at: now,
      processed_at: null,
    })
    .eq("event_id", event.id)
    .in("status", ["failed", "received"])
    .select("event_id, status, attempt_count")
    .maybeSingle();

  if (claimError) {
    throw new Error(claimError.message);
  }

  if (!claimed) {
    return {
      shouldProcess: false,
      isDuplicate: true,
      status: existing.status,
    };
  }

  return { shouldProcess: true, isDuplicate: true, status: "processing" };
}

export async function markWebhookEventProcessed(eventId: string) {
  const admin = supabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("webhook_events")
    .update({
      status: "processed",
      processed_at: now,
      error_message: null,
      updated_at: now,
      last_seen_at: now,
    })
    .eq("event_id", eventId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markWebhookEventFailed(eventId: string, errorMessage: string) {
  const admin = supabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("webhook_events")
    .update({
      status: "failed",
      error_message: errorMessage,
      updated_at: now,
      last_seen_at: now,
    })
    .eq("event_id", eventId);

  if (error) {
    throw new Error(error.message);
  }
}
