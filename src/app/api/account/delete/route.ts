import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseServerClient } from "@/server/db/supabaseServer";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { removeStorageFiles } from "@/server/storage/cleanup";
import { stripe } from "@/server/billing/stripe";
import { logger } from "@/lib/logger";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
]);

const REQUIRED_CONFIRM_TEXT = "EXCLUIR MINHA CONTA";

const schema = z.object({
  password: z.string().min(8),
  confirmEmail: z.string().email(),
  confirmText: z.string(),
  acknowledged: z.literal(true),
});

function getAnonymousSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing Supabase public env vars");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  if (parsed.data.confirmText.trim().toUpperCase() !== REQUIRED_CONFIRM_TEXT) {
    return NextResponse.json({ error: "Texto de confirmacao invalido." }, { status: 400 });
  }

  const supabase = await supabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });
  }

  if (parsed.data.confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "Email de confirmacao nao confere." }, { status: 400 });
  }

  const verifier = getAnonymousSupabaseClient();
  const { error: authError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
  });
  if (authError) {
    return NextResponse.json({ error: "Senha atual invalida." }, { status: 401 });
  }
  await verifier.auth.signOut();

  const admin = supabaseAdmin();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("clinic_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile?.clinic_id) {
    return NextResponse.json({ error: "Perfil da conta nao encontrado." }, { status: 404 });
  }

  if (profile.role !== "admin") {
    return NextResponse.json(
      { error: "Somente o admin dono da clinica pode excluir a conta." },
      { status: 403 }
    );
  }

  const clinicId = profile.clinic_id as string;

  const { data: clinic, error: clinicError } = await admin
    .from("clinics")
    .select("id, owner_user_id")
    .eq("id", clinicId)
    .maybeSingle();

  if (clinicError) {
    return NextResponse.json({ error: clinicError.message }, { status: 500 });
  }

  if (!clinic?.id || clinic.owner_user_id !== user.id) {
    return NextResponse.json(
      { error: "Somente o admin dono da clinica pode excluir a conta." },
      { status: 403 }
    );
  }

  const { count: membershipCount, error: membershipError } = await admin
    .from("memberships")
    .select("user_id", { count: "exact", head: true })
    .eq("clinic_id", clinicId);

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  if ((membershipCount ?? 0) > 1) {
    return NextResponse.json(
      { error: "Remova os demais usuarios da clinica antes de excluir a conta." },
      { status: 409 }
    );
  }

  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (subscriptionError) {
    return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
  }

  if (
    subscription?.stripe_subscription_id &&
    ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status ?? "")
  ) {
    try {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
    } catch (error) {
      logger.error("Failed to cancel subscription during account deletion", {
        userId: user.id,
        clinicId,
        subscriptionId: subscription.stripe_subscription_id,
        error: (error as Error).message,
      });
      return NextResponse.json(
        { error: "Nao foi possivel cancelar a assinatura no Stripe." },
        { status: 500 }
      );
    }
  }

  logger.info("Deleting account and clinic", {
    userId: user.id,
    clinicId,
    email: user.email,
  });

  const recyclePayload = {
    status: "EXPIRED",
    user_id: null,
    document_type: null,
    document_number: null,
    cpf_hash: null,
    phone_hash: null,
    phone_e164: null,
    address: null,
    cep: null,
    timezone: null,
    email_verified: false,
    phone_verified_at: null,
    cpf_validated_at: null,
    otp_hash: null,
    otp_expires_at: null,
    otp_attempts: 0,
    otp_last_sent_at: null,
    otp_locked_until: null,
    otp_send_count: 0,
    otp_send_window_start: null,
    checkout_session_id: null,
    updated_at: new Date().toISOString(),
  };

  const { error: recycleByUserError } = await admin
    .from("signup_intents")
    .update(recyclePayload)
    .eq("user_id", user.id);
  if (recycleByUserError) {
    return NextResponse.json({ error: recycleByUserError.message }, { status: 500 });
  }

  const { error: recycleByEmailError } = await admin
    .from("signup_intents")
    .update(recyclePayload)
    .eq("email", user.email)
    .is("user_id", null);
  if (recycleByEmailError) {
    return NextResponse.json({ error: recycleByEmailError.message }, { status: 500 });
  }

  const [attachmentsResult, patientsResult, anamnesesResult] = await Promise.all([
    admin
      .from("attachments")
      .select("file_path")
      .eq("clinic_id", clinicId),
    admin
      .from("patients")
      .select("photo_path, signature_path")
      .eq("clinic_id", clinicId),
    admin
      .from("anamnesis_responses")
      .select("signature_url")
      .eq("clinic_id", clinicId),
  ]);

  if (attachmentsResult.error) {
    return NextResponse.json({ error: attachmentsResult.error.message }, { status: 500 });
  }
  if (patientsResult.error) {
    return NextResponse.json({ error: patientsResult.error.message }, { status: 500 });
  }
  if (anamnesesResult.error) {
    return NextResponse.json({ error: anamnesesResult.error.message }, { status: 500 });
  }

  const attachmentPaths = (attachmentsResult.data ?? []).map((item) =>
    String(item.file_path ?? "")
  );
  const patientPaths = (patientsResult.data ?? []).flatMap((item) => [
    item.photo_path ? String(item.photo_path) : "",
    item.signature_path ? String(item.signature_path) : "",
  ]);
  const anamnesisSignaturePaths = (anamnesesResult.data ?? []).map((item) =>
    String(item.signature_url ?? "")
  );

  try {
    await removeStorageFiles([
      ...attachmentPaths,
      ...patientPaths,
      ...anamnesisSignaturePaths,
    ]);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }

  const { error: clinicDeleteError } = await admin.from("clinics").delete().eq("id", clinicId);
  if (clinicDeleteError) {
    return NextResponse.json({ error: clinicDeleteError.message }, { status: 500 });
  }

  const { error: userDeleteError } = await admin.auth.admin.deleteUser(user.id);
  if (userDeleteError) {
    return NextResponse.json({ error: userDeleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
