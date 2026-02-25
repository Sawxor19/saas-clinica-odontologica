import { supabaseServerClient } from "@/server/db/supabaseServer";

export type ClinicalDocumentType = "prescription" | "certificate" | "clinical_document";

export type PrescriptionRecord = {
  id: string;
  clinic_id: string;
  patient_id: string;
  dentist_id: string;
  content: string;
  document_type: ClinicalDocumentType;
  title: string | null;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
};

function parseDocumentType(value: unknown): ClinicalDocumentType {
  if (value === "certificate" || value === "clinical_document") return value;
  return "prescription";
}

function toPrescriptionRecord(row: Record<string, unknown>): PrescriptionRecord {
  return {
    id: String(row.id ?? ""),
    clinic_id: String(row.clinic_id ?? ""),
    patient_id: String(row.patient_id ?? ""),
    dentist_id: String(row.dentist_id ?? ""),
    content: String(row.content ?? ""),
    document_type: parseDocumentType(row.document_type),
    title: row.title ? String(row.title) : null,
    file_path: row.file_path ? String(row.file_path) : null,
    file_name: row.file_name ? String(row.file_name) : null,
    created_at: String(row.created_at ?? ""),
  };
}

export async function listPrescriptionsByPatient(clinicId: string, patientId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .select(
      "id, clinic_id, patient_id, dentist_id, content, document_type, title, file_path, file_name, created_at"
    )
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((item) => toPrescriptionRecord(item as Record<string, unknown>));
}

export async function createPrescription(
  clinicId: string,
  input: {
    patient_id: string;
    dentist_id: string;
    content: string;
    document_type: ClinicalDocumentType;
    title: string | null;
    file_path: string | null;
    file_name: string | null;
  }
) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      dentist_id: input.dentist_id,
      content: input.content,
      document_type: input.document_type,
      title: input.title,
      file_path: input.file_path,
      file_name: input.file_name,
    })
    .select(
      "id, clinic_id, patient_id, dentist_id, content, document_type, title, file_path, file_name, created_at"
    )
    .single();

  if (error) throw new Error(error.message);
  return toPrescriptionRecord(data as Record<string, unknown>);
}
