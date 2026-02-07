import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { auditLog } from "@/server/audit/auditLog";
import { SupabaseStorageProvider } from "@/server/storage/supabase";
import {
  createAttachment,
  deleteAttachment,
  listAttachmentsByPatient,
} from "@/server/repositories/attachments";

const storage = new SupabaseStorageProvider();

export async function getAttachments(patientId: string) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "readClinical");
  const data = await listAttachmentsByPatient(clinicId, patientId);
  await auditLog({
    clinicId,
    userId,
    action: "attachments.list",
    entity: "attachment",
    metadata: { patientId },
  });
  return data;
}

export async function addAttachment(input: {
  patient_id: string;
  file: File;
  category: string;
}) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writeClinicalNotes");
  const path = `${clinicId}/${input.patient_id}/${Date.now()}-${input.file.name}`;
  const upload = await storage.upload(input.file, path);
  const result = await createAttachment(clinicId, {
    patient_id: input.patient_id,
    file_path: upload.path,
    file_name: input.file.name,
    category: input.category,
  });
  await auditLog({
    clinicId,
    userId,
    action: "attachments.create",
    entity: "attachment",
    entityId: result.id,
    metadata: { patientId: input.patient_id, category: input.category },
  });
  return upload;
}

export async function removeAttachment(attachmentId: string, filePath: string) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writeClinicalNotes");
  await deleteAttachment(clinicId, attachmentId);
  await storage.remove(filePath);
  await auditLog({
    clinicId,
    userId,
    action: "attachments.delete",
    entity: "attachment",
    entityId: attachmentId,
  });
}

export async function getAttachmentUrl(filePath: string) {
  const { permissions } = await getClinicContext();
  assertPermission(permissions, "readClinical");
  return storage.getSignedUrl(filePath);
}
