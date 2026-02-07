import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { createMaterial, deleteMaterial, listMaterials, updateMaterial } from "@/server/repositories/materials";
import { listProcedureMaterials } from "@/server/repositories/procedures";
import { listCompletedAppointmentsByRange } from "@/server/repositories/appointments";

function daysAgo(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - days);
  return copy;
}

export async function getMaterials() {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "manageInventory");
  return listMaterials(clinicId);
}

export async function addMaterial(input: {
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
}) {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "manageInventory");
  return createMaterial(clinicId, input);
}

export async function updateMaterialItem(input: {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
}) {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "manageInventory");
  return updateMaterial(clinicId, input.id, input);
}

export async function removeMaterial(id: string) {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "manageInventory");
  await deleteMaterial(clinicId, id);
}

export async function getInventoryInsights() {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "manageInventory");
  const materials = await listMaterials(clinicId);
  const lowStock = materials.filter(
    (item) => Number(item.current_stock) <= Number(item.min_stock)
  );

  const end = new Date();
  const start = daysAgo(end, 30);
  const [completedAppointments, procedureMaterials] = await Promise.all([
    listCompletedAppointmentsByRange(clinicId, start.toISOString(), end.toISOString()),
    listProcedureMaterials(clinicId),
  ]);

  const procedureCount = new Map<string, number>();
  completedAppointments.forEach((item) => {
    if (!item.procedure_id) return;
    procedureCount.set(item.procedure_id, (procedureCount.get(item.procedure_id) ?? 0) + 1);
  });

  const materialUsage = new Map<string, number>();
  procedureMaterials.forEach((link) => {
    const count = procedureCount.get(link.procedure_id) ?? 0;
    if (count === 0) return;
    materialUsage.set(
      link.material_id,
      (materialUsage.get(link.material_id) ?? 0) + count * Number(link.quantity)
    );
  });

  const forecast = materials.map((material) => {
    const usedIn30Days = materialUsage.get(material.id) ?? 0;
    const avgDaily = usedIn30Days / 30;
    const daysLeft = avgDaily > 0 ? Number(material.current_stock) / avgDaily : null;
    return {
      ...material,
      usedIn30Days,
      avgDaily,
      daysLeft,
    };
  });

  return { lowStock, forecast };
}
