import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { auditLog } from "@/server/audit/auditLog";
import { getOdontogramByPatient, upsertOdontogram } from "@/server/repositories/odontograms";

export async function getOdontogram(patientId: string) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "readClinical");
  const data = await getOdontogramByPatient(clinicId, patientId);
  await auditLog({
    clinicId,
    userId,
    action: "odontogram.view",
    entity: "odontogram",
    metadata: { patientId },
  });
  return data;
}

export async function saveOdontogram(patientId: string, data: Record<string, unknown>) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writeClinicalNotes");
  await upsertOdontogram(clinicId, patientId, data);
  await auditLog({
    clinicId,
    userId,
    action: "odontogram.update",
    entity: "odontogram",
    metadata: { patientId },
  });
}
