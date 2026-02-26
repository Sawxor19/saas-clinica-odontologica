import { patientSchema, PatientInput } from "@/types/schemas";
import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import {
  createPatient,
  getPatientById,
  hardDeletePatient,
  listPatients,
  updatePatient,
  updatePatientPhoto,
} from "@/server/repositories/patients";
import { listAppointmentsByPatient } from "@/server/repositories/appointments";
import { auditLog } from "@/server/audit/auditLog";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { removeStorageFiles } from "@/server/storage/cleanup";

export async function getPatients(query?: string) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "readPatients");
  const data = await listPatients(clinicId, query);
  await auditLog({
    clinicId,
    userId,
    action: "patients.list",
    entity: "patient",
    metadata: { query: query ?? null },
  });
  return data;
}

export async function addPatient(input: PatientInput) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writePatients");
  const parsed = patientSchema.parse(input);
  const result = await createPatient(clinicId, parsed);
  await auditLog({
    clinicId,
    userId,
    action: "patients.create",
    entity: "patient",
    entityId: result.id,
  });
  return result;
}

export async function removePatient(patientId: string) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writePatients");

  const admin = supabaseAdmin();
  const [attachmentsResult, patientResult, signaturesResult] = await Promise.all([
    admin
      .from("attachments")
      .select("file_path")
      .eq("clinic_id", clinicId)
      .eq("patient_id", patientId),
    admin
      .from("patients")
      .select("photo_path, signature_path")
      .eq("clinic_id", clinicId)
      .eq("id", patientId)
      .maybeSingle(),
    admin
      .from("anamnesis_responses")
      .select("signature_url")
      .eq("clinic_id", clinicId)
      .eq("patient_id", patientId),
  ]);

  if (attachmentsResult.error) throw new Error(attachmentsResult.error.message);
  if (patientResult.error) throw new Error(patientResult.error.message);
  if (signaturesResult.error) throw new Error(signaturesResult.error.message);

  const attachmentPaths = (attachmentsResult.data ?? []).map((item) =>
    String(item.file_path ?? "")
  );
  const anamnesisSignaturePaths = (signaturesResult.data ?? []).map((item) =>
    String(item.signature_url ?? "")
  );

  await removeStorageFiles([
    ...attachmentPaths,
    ...anamnesisSignaturePaths,
    patientResult.data?.photo_path ? String(patientResult.data.photo_path) : null,
    patientResult.data?.signature_path ? String(patientResult.data.signature_path) : null,
  ]);

  await hardDeletePatient(clinicId, patientId);
  await auditLog({
    clinicId,
    userId,
    action: "patients.delete",
    entity: "patient",
    entityId: patientId,
  });
}

export async function updatePatientItem(patientId: string, input: PatientInput) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writePatients");
  const parsed = patientSchema.parse(input);
  await updatePatient(clinicId, patientId, parsed);
  await auditLog({
    clinicId,
    userId,
    action: "patients.update",
    entity: "patient",
    entityId: patientId,
  });
}

export async function updatePatientPhotoItem(patientId: string, photoPath: string | null) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writePatients");
  await updatePatientPhoto(clinicId, patientId, photoPath);
  await auditLog({
    clinicId,
    userId,
    action: "patients.photo",
    entity: "patient",
    entityId: patientId,
  });
}

export async function getPatient(patientId: string) {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "readPatients");
  return getPatientById(clinicId, patientId);
}

export async function getPatientAppointments(patientId: string) {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "readPatients");
  return listAppointmentsByPatient(clinicId, patientId);
}
