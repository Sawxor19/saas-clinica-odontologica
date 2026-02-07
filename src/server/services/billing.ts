import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { getSubscription, listPaymentHistory } from "@/server/repositories/subscriptions";

export async function getBillingSummary() {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "manageBilling");
  const subscription = await getSubscription(clinicId);
  const payments = await listPaymentHistory(clinicId);
  return { subscription, payments };
}
