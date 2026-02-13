import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { isSmsConfigured, sendSmsMessage } from "@/server/notifications/sms";
import { normalizeCPF, validateCPF } from "@/utils/validation/cpf";
import { normalizePhoneToE164 } from "@/utils/validation/phone";
import { hmacSha256 } from "@/utils/security/hmac";
import { computeOtpVerification, generateOtp, hashOtp } from "@/utils/security/otp";
import {
  findSignupIntentByCpfHash,
  findSignupIntentByEmail,
  findSignupIntentById,
  findSignupIntentByPhoneHash,
  insertSignupIntent,
  updateSignupIntent,
} from "@/server/repositories/signupIntents";
import { logger } from "@/lib/logger";

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCKOUT_MINUTES = 15;
const OTP_MAX_SEND_PER_DAY = 5;
const REQUIRE_PHONE_VERIFICATION = process.env.SIGNUP_REQUIRE_PHONE_VERIFICATION === "true";

function getSignupSecret() {
  const secret = process.env.SIGNUP_HMAC_SECRET || process.env.SIGNUP_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("Missing SIGNUP_HMAC_SECRET or SIGNUP_ENCRYPTION_KEY");
  }
  return secret;
}

function toDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function shouldBlockStatus(status?: string | null) {
  return ["CONVERTED", "CHECKOUT_STARTED", "VERIFIED"].includes(status ?? "");
}

async function logSignupAudit(params: {
  intentId: string;
  action: string;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    const admin = supabaseAdmin();
    await admin.from("signup_audit_logs").insert({
      intent_id: params.intentId,
      action: params.action,
      ip_address: params.ip ?? null,
      user_agent: params.userAgent ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (error) {
    logger.warn("Signup audit log failed", { error });
  }
}

export async function createSignupIntent(input: {
  email: string;
  userId: string;
  cpf: string;
  phone: string;
  clinicName?: string | null;
  adminName?: string | null;
  whatsappNumber?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const cpfNormalized = normalizeCPF(input.cpf);
  if (!validateCPF(cpfNormalized)) {
    throw new Error("CPF inválido.");
  }

  const phoneE164 = normalizePhoneToE164(input.phone);
  if (!phoneE164) {
    throw new Error("Telefone inválido.");
  }

  const secret = getSignupSecret();
  const cpfHash = hmacSha256(secret, cpfNormalized);
  const phoneHash = hmacSha256(secret, phoneE164);

  const existingCpf = await findSignupIntentByCpfHash(cpfHash);
  if (existingCpf && shouldBlockStatus(existingCpf.status)) {
    throw new Error("CPF já utilizado para cadastro.");
  }

  const existingPhone = await findSignupIntentByPhoneHash(phoneHash);
  if (existingPhone && shouldBlockStatus(existingPhone.status)) {
    throw new Error("Telefone já utilizado para cadastro.");
  }

  const existingByEmail = await findSignupIntentByEmail(input.email);
  if (existingByEmail && shouldBlockStatus(existingByEmail.status)) {
    throw new Error("Cadastro já iniciado para este email.");
  }

  const payload = {
    email: input.email,
    user_id: input.userId,
    clinic_name: input.clinicName ?? null,
    admin_name: input.adminName ?? null,
    whatsapp_number: input.whatsappNumber ?? null,
    cpf_hash: cpfHash,
    phone_e164: phoneE164,
    phone_hash: phoneHash,
    email_verified: false,
    phone_verified_at: REQUIRE_PHONE_VERIFICATION ? null : new Date().toISOString(),
    cpf_validated_at: new Date().toISOString(),
    status: "PENDING",
    updated_at: new Date().toISOString(),
  };

  const intent = existingByEmail
    ? await updateSignupIntent(existingByEmail.id, payload)
    : await insertSignupIntent(payload);

  await logSignupAudit({
    intentId: intent.id,
    action: "signup.intent.created",
    ip: input.ip,
    userAgent: input.userAgent,
  });

  if (REQUIRE_PHONE_VERIFICATION) {
    await sendPhoneOtp(intent.id, input.ip, input.userAgent);
  }

  return intent;
}

export async function sendPhoneOtp(intentId: string, ip?: string | null, userAgent?: string | null) {
  const intent = await findSignupIntentById(intentId);
  if (intent.status === "CONVERTED") {
    throw new Error("Cadastro já concluído.");
  }
  if (intent.status === "BLOCKED" || intent.status === "EXPIRED") {
    throw new Error("Cadastro indisponível.");
  }
  if (intent.phone_verified_at) {
    throw new Error("Telefone já verificado.");
  }

  const now = new Date();
  const lastSentAt = toDate(intent.otp_last_sent_at);
  if (lastSentAt && now.getTime() - lastSentAt.getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    throw new Error("Aguarde alguns segundos para reenviar o código.");
  }

  const windowStart = toDate(intent.otp_send_window_start);
  const sendWindowStart = windowStart && now.getTime() - windowStart.getTime() < 24 * 60 * 60 * 1000
    ? windowStart
    : now;
  const sendCount = windowStart && sendWindowStart === windowStart ? intent.otp_send_count ?? 0 : 0;
  if (sendCount >= OTP_MAX_SEND_PER_DAY) {
    throw new Error("Limite diário de envio atingido.");
  }

  const otp = generateOtp(6);
  const secret = getSignupSecret();
  const otpHash = hashOtp(secret, otp);

  await updateSignupIntent(intent.id, {
    otp_hash: otpHash,
    otp_expires_at: new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString(),
    otp_attempts: 0,
    otp_last_sent_at: now.toISOString(),
    otp_locked_until: null,
    otp_send_count: sendCount + 1,
    otp_send_window_start: sendWindowStart.toISOString(),
    updated_at: now.toISOString(),
  });

  if (!intent.phone_e164) {
    throw new Error("Telefone não cadastrado.");
  }

  await sendSmsMessage({
    to: intent.phone_e164,
    body: `Seu código de verificação é ${otp}. Ele expira em ${OTP_EXPIRY_MINUTES} minutos.`,
  });

  await logSignupAudit({
    intentId: intent.id,
    action: "signup.phone.otp_sent",
    ip,
    userAgent,
  });

  if (!isSmsConfigured() && process.env.NODE_ENV !== "production") {
    logger.warn("SMS credentials missing; using dev OTP.", { intentId, otp });
    return { devOtp: otp };
  }

  return { devOtp: undefined };
}

export async function verifyPhoneOtp(intentId: string, otp: string, ip?: string | null, userAgent?: string | null) {
  const intent = await findSignupIntentById(intentId);
  if (intent.status === "BLOCKED" || intent.status === "EXPIRED") {
    throw new Error("Cadastro indisponível.");
  }
  const secret = getSignupSecret();
  const now = new Date();

  const result = computeOtpVerification({
    now,
    otpHash: intent.otp_hash,
    otp,
    attempts: intent.otp_attempts ?? 0,
    expiresAt: toDate(intent.otp_expires_at),
    lockedUntil: toDate(intent.otp_locked_until),
    maxAttempts: OTP_MAX_ATTEMPTS,
    lockoutMinutes: OTP_LOCKOUT_MINUTES,
    secret,
  });

  if (result.status === "locked") {
    await updateSignupIntent(intent.id, {
      otp_attempts: result.attempts,
      otp_locked_until: result.lockedUntil?.toISOString() ?? null,
      updated_at: now.toISOString(),
    });
    throw new Error("Muitas tentativas. Aguarde antes de tentar novamente.");
  }

  if (result.status === "expired") {
    throw new Error("Código expirado. Solicite um novo.");
  }

  if (result.status === "invalid") {
    await updateSignupIntent(intent.id, {
      otp_attempts: result.attempts,
      updated_at: now.toISOString(),
    });
    throw new Error("Código inválido.");
  }

  const emailVerified = await assertEmailVerifiedBySupabase(intent.user_id);
  const nextStatus = emailVerified ? "VERIFIED" : "PENDING_VERIFICATIONS";

  await updateSignupIntent(intent.id, {
    phone_verified_at: now.toISOString(),
    otp_hash: null,
    otp_expires_at: null,
    otp_attempts: 0,
    otp_locked_until: null,
    email_verified: emailVerified,
    status: nextStatus,
    updated_at: now.toISOString(),
  });

  await logSignupAudit({
    intentId: intent.id,
    action: "signup.phone.verified",
    ip,
    userAgent,
  });

  return { emailVerified };
}

export async function assertEmailVerifiedBySupabase(userId?: string | null) {
  if (!userId) return false;
  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return false;
  return Boolean(data.user.email_confirmed_at);
}

export async function refreshEmailVerification(intentId: string) {
  const intent = await findSignupIntentById(intentId);
  const emailVerified = await assertEmailVerifiedBySupabase(intent.user_id);
  const phoneVerified = REQUIRE_PHONE_VERIFICATION ? Boolean(intent.phone_verified_at) : true;
  const phoneVerifiedAt = REQUIRE_PHONE_VERIFICATION
    ? intent.phone_verified_at
    : intent.phone_verified_at ?? new Date().toISOString();
  const nextStatus = emailVerified && phoneVerified ? "VERIFIED" : "PENDING_VERIFICATIONS";
  await updateSignupIntent(intent.id, {
    email_verified: emailVerified,
    phone_verified_at: phoneVerifiedAt,
    status: nextStatus,
    updated_at: new Date().toISOString(),
  });
  return { emailVerified, phoneVerified };
}

export async function ensureReadyForCheckout(intentId: string) {
  const intent = await findSignupIntentById(intentId);
  if (intent.status === "BLOCKED" || intent.status === "EXPIRED") {
    throw new Error("Cadastro indisponível.");
  }
  const emailVerified = await assertEmailVerifiedBySupabase(intent.user_id);
  if (!emailVerified) {
    await updateSignupIntent(intent.id, {
      email_verified: false,
      status: "PENDING_VERIFICATIONS",
      updated_at: new Date().toISOString(),
    });
    throw new Error("E-mail ainda não confirmado.");
  }

  if (REQUIRE_PHONE_VERIFICATION && !intent.phone_verified_at) {
    throw new Error("Telefone ainda não verificado.");
  }

  if (!intent.cpf_validated_at || !intent.cpf_hash) {
    throw new Error("CPF inválido.");
  }

  await updateSignupIntent(intent.id, {
    email_verified: true,
    status: "CHECKOUT_STARTED",
    updated_at: new Date().toISOString(),
  });

  return intent;
}

export async function markSignupConverted(intentId: string) {
  await updateSignupIntent(intentId, {
    status: "CONVERTED",
    updated_at: new Date().toISOString(),
  });
}

export async function blockSignupIntent(intentId: string) {
  await updateSignupIntent(intentId, {
    status: "BLOCKED",
    updated_at: new Date().toISOString(),
  });
}
