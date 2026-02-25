import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { supabaseServerClient } from "@/server/db/supabaseServer";

export type AnamnesisQuestionType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "boolean"
  | "single_choice"
  | "multiple_choice";

export type AnamnesisQuestion = {
  id: string;
  label: string;
  type: AnamnesisQuestionType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export type AnamnesisTemplateRecord = {
  id: string;
  title: string;
  description: string | null;
  questions: AnamnesisQuestion[];
  is_active: boolean;
  created_at?: string;
};

export type AnamnesisPublicLinkRecord = {
  id: string;
  clinic_id: string;
  template_id: string;
  patient_id: string | null;
  expires_at: string;
  used_at: string | null;
  template: AnamnesisTemplateRecord | null;
  patient: {
    id: string;
    full_name: string | null;
    cpf: string | null;
    signature_path: string | null;
  } | null;
};

export async function listAnamnesisTemplates(clinicId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("anamnesis_templates")
    .select("id, title, description, questions, is_active, created_at")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createAnamnesisTemplate(
  clinicId: string,
  createdBy: string,
  input: { title: string; description?: string | null; questions: AnamnesisQuestion[] }
) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("anamnesis_templates")
    .insert({
      clinic_id: clinicId,
      created_by: createdBy,
      title: input.title,
      description: input.description ?? null,
      questions: input.questions,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .select("id, title, description, questions, is_active, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createAnamnesisLink(input: {
  clinicId: string;
  templateId: string;
  patientId?: string | null;
  token: string;
  expiresAt: string;
  createdBy: string;
}) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("anamnesis_links")
    .insert({
      clinic_id: input.clinicId,
      template_id: input.templateId,
      patient_id: input.patientId ?? null,
      token: input.token,
      expires_at: input.expiresAt,
      created_by: input.createdBy,
    })
    .select("id, token, expires_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getAnamnesisTemplateById(clinicId: string, templateId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("anamnesis_templates")
    .select("id, title, description, questions, is_active")
    .eq("clinic_id", clinicId)
    .eq("id", templateId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as AnamnesisTemplateRecord | null) ?? null;
}

export async function getAnamnesisLinkByToken(token: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("anamnesis_links")
    .select(
      "id, clinic_id, template_id, patient_id, expires_at, used_at, template:anamnesis_templates(id, title, description, questions, is_active), patient:patients(id, full_name, cpf, signature_path)"
    )
    .eq("token", token)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const rawTemplate = data.template as unknown;
  const rawPatient = data.patient as unknown;
  const template = (Array.isArray(rawTemplate) ? rawTemplate[0] : rawTemplate) as
    | AnamnesisTemplateRecord
    | null;
  const patient = (Array.isArray(rawPatient) ? rawPatient[0] : rawPatient) as
    | {
        id: string;
        full_name: string | null;
        cpf: string | null;
        signature_path: string | null;
      }
    | null;

  return {
    id: data.id as string,
    clinic_id: data.clinic_id as string,
    template_id: data.template_id as string,
    patient_id: (data.patient_id as string | null) ?? null,
    expires_at: data.expires_at as string,
    used_at: (data.used_at as string | null) ?? null,
    template,
    patient,
  } satisfies AnamnesisPublicLinkRecord;
}

export async function markAnamnesisLinkUsed(linkId: string) {
  const admin = supabaseAdmin();
  const { error } = await admin
    .from("anamnesis_links")
    .update({ used_at: new Date().toISOString() })
    .eq("id", linkId);

  if (error) throw new Error(error.message);
}

export async function findPatientByCpf(clinicId: string, cpfDigits: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("patients")
    .select("id, full_name, cpf, signature_path")
    .eq("clinic_id", clinicId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const normalized = (data ?? []).find((item) => {
    const digits = String(item.cpf ?? "").replace(/\D/g, "");
    return digits.length > 0 && digits === cpfDigits;
  });
  return normalized ?? null;
}

export async function insertAnamnesisSubmission(input: {
  clinicId: string;
  templateId: string;
  linkId: string;
  patientId?: string | null;
  fullName: string;
  cpf: string;
  signedDate: string;
  answers: Record<string, unknown>;
  signaturePath: string | null;
  identityVerified: boolean;
}) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("anamnesis_submissions")
    .insert({
      clinic_id: input.clinicId,
      template_id: input.templateId,
      link_id: input.linkId,
      patient_id: input.patientId ?? null,
      full_name: input.fullName,
      cpf: input.cpf,
      signed_date: input.signedDate,
      answers: input.answers,
      signature_path: input.signaturePath,
      identity_verified: input.identityVerified,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updatePatientSignaturePath(patientId: string, signaturePath: string) {
  const admin = supabaseAdmin();
  const { error } = await admin
    .from("patients")
    .update({ signature_path: signaturePath })
    .eq("id", patientId);

  if (error) throw new Error(error.message);
}
