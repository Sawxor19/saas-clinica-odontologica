import { supabaseServerClient } from "@/server/db/supabaseServer";

export async function getOdontogramByPatient(clinicId: string, patientId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("odontograms")
    .select("id, data, updated_at")
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return data ?? null;
}

export async function upsertOdontogram(
  clinicId: string,
  patientId: string,
  data: Record<string, unknown>
) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("odontograms")
    .upsert(
      {
        clinic_id: clinicId,
        patient_id: patientId,
        data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "patient_id" }
    );

  if (error) throw new Error(error.message);
}
