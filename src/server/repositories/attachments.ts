import { supabaseServerClient } from "@/server/db/supabaseServer";

export async function listAttachmentsByPatient(clinicId: string, patientId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("attachments")
    .select("id, file_path, file_name, category, created_at")
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createAttachment(
  clinicId: string,
  input: {
    patient_id: string;
    file_path: string;
    file_name: string;
    category: string;
  }
) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("attachments")
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      file_path: input.file_path,
      file_name: input.file_name,
      category: input.category,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteAttachment(clinicId: string, attachmentId: string) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("id", attachmentId);

  if (error) throw new Error(error.message);
}