import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { auditLog } from "@/server/audit/auditLog";
import {
  createPayable,
  deletePayable,
  listPayables,
  updatePayable,
} from "@/server/repositories/payables";

export async function getPayables() {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "readFinance");
  const data = await listPayables(clinicId);
  await auditLog({
    clinicId,
    userId,
    action: "payables.list",
    entity: "payable",
  });
  return data;
}

export async function addPayable(input: {
  name: string;
  amount: number;
  due_date: string;
  payment_method: string;
  installments?: number | null;
  is_paid: boolean;
}) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writePayments");
  const result = await createPayable(clinicId, input);
  await auditLog({
    clinicId,
    userId,
    action: "payables.create",
    entity: "payable",
    entityId: result.id,
  });
  return result;
}

export async function updatePayableItem(input: {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  payment_method: string;
  installments?: number | null;
  is_paid: boolean;
}) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writePayments");
  await updatePayable(clinicId, input.id, input);
  await auditLog({
    clinicId,
    userId,
    action: "payables.update",
    entity: "payable",
    entityId: input.id,
  });
}

export async function removePayable(id: string) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writePayments");
  await deletePayable(clinicId, id);
  await auditLog({
    clinicId,
    userId,
    action: "payables.delete",
    entity: "payable",
    entityId: id,
  });
}
