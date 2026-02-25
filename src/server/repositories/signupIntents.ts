import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type SignupIntentStatus =
  | "PENDING"
  | "PENDING_VERIFICATIONS"
  | "VERIFIED"
  | "CHECKOUT_STARTED"
  | "CONVERTED"
  | "BLOCKED"
  | "EXPIRED";

export type SignupIntent = {
  id: string;
  email: string;
  user_id: string | null;
  clinic_name: string | null;
  admin_name: string | null;
  whatsapp_number: string | null;
  document_type: "cpf" | "cnpj" | null;
  document_number: string | null;
  cpf_hash: string | null;
  phone_e164: string | null;
  phone_hash: string | null;
  address: string | null;
  cep: string | null;
  timezone: string | null;
  email_verified: boolean | null;
  phone_verified_at: string | null;
  cpf_validated_at: string | null;
  otp_hash: string | null;
  otp_expires_at: string | null;
  otp_attempts: number | null;
  otp_last_sent_at: string | null;
  otp_locked_until: string | null;
  otp_send_count: number | null;
  otp_send_window_start: string | null;
  status: SignupIntentStatus | null;
  checkout_session_id: string | null;
  created_at: string;
  updated_at: string | null;
};

export async function findSignupIntentById(id: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("signup_intents")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as SignupIntent;
}

export async function findSignupIntentByEmail(email: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("signup_intents")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data as SignupIntent;
}

export async function findSignupIntentByCpfHash(cpfHash: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("signup_intents")
    .select("*")
    .eq("cpf_hash", cpfHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data as SignupIntent;
}

export async function findSignupIntentByPhoneHash(phoneHash: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("signup_intents")
    .select("*")
    .eq("phone_hash", phoneHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data as SignupIntent;
}

export async function insertSignupIntent(payload: Record<string, unknown>) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("signup_intents")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as SignupIntent;
}

export async function updateSignupIntent(id: string, payload: Record<string, unknown>) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("signup_intents")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as SignupIntent;
}
