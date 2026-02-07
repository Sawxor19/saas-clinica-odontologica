import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { auditLog } from "@/server/audit/auditLog";
import {
  createClinicalNote,
  listClinicalNotesByPatient,
} from "@/server/repositories/clinicalNotes";

export async function getClinicalNotes(patientId: string) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "readClinical");
  const notes = await listClinicalNotesByPatient(clinicId, patientId);
  await auditLog({
    clinicId,
    userId,
    action: "clinical_notes.list",
    entity: "clinical_note",
    metadata: { patientId },
  });
  return notes;
}

export async function addClinicalNote(patientId: string, note: string) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writeClinicalNotes");
  const result = await createClinicalNote(clinicId, {
    patient_id: patientId,
    dentist_id: userId,
    note,
  });
  await auditLog({
    clinicId,
    userId,
    action: "clinical_notes.create",
    entity: "clinical_note",
    entityId: result.id,
    metadata: { patientId },
  });
  return result;
}
