import { supabaseServerClient } from "@/server/db/supabaseServer";
import { PatientInput } from "@/types/schemas";

export async function listPatients(clinicId: string, query?: string) {
  const supabase = await supabaseServerClient();
  let request = supabase
    .from("patients")
    .select(
      "id, full_name, email, phone, birth_date, notes, cpf, address, cep, emergency_contact, allergies, chronic_conditions, medications, alerts, status, dentist_id, created_at"
    )
    .eq("clinic_id", clinicId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (query) {
    request = request.ilike("full_name", `%${query}%`);
  }

  const { data, error } = await request;
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function listPatientsByIds(clinicId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, phone")
    .eq("clinic_id", clinicId)
    .is("deleted_at", null)
    .in("id", ids);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPatient(clinicId: string, input: PatientInput) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: clinicId,
      full_name: input.full_name,
      email: input.email || null,
      phone: input.phone || null,
      birth_date: input.birth_date || null,
      notes: input.notes || null,
      cpf: input.cpf || null,
      address: input.address || null,
      cep: input.cep || null,
      emergency_contact: input.emergency_contact || null,
      allergies: input.allergies || null,
      chronic_conditions: input.chronic_conditions || null,
      medications: input.medications || null,
      alerts: input.alerts || null,
      status: input.status || "active",
      dentist_id: input.dentist_id || null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function getPatientById(clinicId: string, patientId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("id", patientId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function softDeletePatient(clinicId: string, patientId: string) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("patients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", patientId)
    .eq("clinic_id", clinicId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function hardDeletePatient(clinicId: string, patientId: string) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("patients")
    .delete()
    .eq("id", patientId)
    .eq("clinic_id", clinicId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePatient(
  clinicId: string,
  patientId: string,
  input: PatientInput
) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("patients")
    .update({
      full_name: input.full_name,
      email: input.email || null,
      phone: input.phone || null,
      birth_date: input.birth_date || null,
      notes: input.notes || null,
      cpf: input.cpf || null,
      address: input.address || null,
      cep: input.cep || null,
      emergency_contact: input.emergency_contact || null,
      allergies: input.allergies || null,
      chronic_conditions: input.chronic_conditions || null,
      medications: input.medications || null,
      alerts: input.alerts || null,
      status: input.status || "active",
      dentist_id: input.dentist_id || null,
    })
    .eq("id", patientId)
    .eq("clinic_id", clinicId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePatientPhoto(
  clinicId: string,
  patientId: string,
  photoPath: string | null
) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("patients")
    .update({ photo_path: photoPath })
    .eq("id", patientId)
    .eq("clinic_id", clinicId);

  if (error) {
    throw new Error(error.message);
  }
}
