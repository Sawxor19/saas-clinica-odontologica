import { supabaseServerClient } from "@/server/db/supabaseServer";

export async function listClinicalNotesByPatient(clinicId: string, patientId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("clinical_notes")
    .select("id, dentist_id, note, created_at")
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createClinicalNote(
  clinicId: string,
  input: { patient_id: string; dentist_id: string; note: string }
) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("clinical_notes")
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      dentist_id: input.dentist_id,
      note: input.note,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}