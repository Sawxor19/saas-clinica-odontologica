import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import {
  attachProcedureMaterial,
  clearProcedureMaterials,
  createProcedure,
  deleteProcedure,
  listProcedures,
  listProcedureMaterials,
  updateProcedure,
} from "@/server/repositories/procedures";

export async function getProcedures() {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "readProcedures");
  const [procedures, materials] = await Promise.all([
    listProcedures(clinicId),
    listProcedureMaterials(clinicId),
  ]);
  return procedures.map((procedure) => ({
    ...procedure,
    materials: materials.filter((item) => item.procedure_id === procedure.id),
  }));
}

export async function addProcedure(input: {
  name: string;
  price: number;
  materials?: Array<{ material_id: string; quantity: number }>;
}) {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "manageProcedures");
  const procedure = await createProcedure(clinicId, {
    name: input.name,
    price: input.price,
  });

  if (input.materials?.length) {
    const valid = input.materials.filter((item) => item.material_id && item.quantity > 0);
    for (const material of valid) {
      await attachProcedureMaterial(clinicId, {
        procedure_id: procedure.id,
        material_id: material.material_id,
        quantity: material.quantity,
      });
    }
  }

  return procedure;
}

export async function updateProcedureWithMaterials(input: {
  id: string;
  name: string;
  price: number;
  materials?: Array<{ material_id: string; quantity: number }>;
}) {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "manageProcedures");
  await updateProcedure(clinicId, input.id, { name: input.name, price: input.price });
  await clearProcedureMaterials(clinicId, input.id);
  if (input.materials?.length) {
    const valid = input.materials.filter((item) => item.material_id && item.quantity > 0);
    for (const material of valid) {
      await attachProcedureMaterial(clinicId, {
        procedure_id: input.id,
        material_id: material.material_id,
        quantity: material.quantity,
      });
    }
  }
}

export async function removeProcedure(id: string) {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "manageProcedures");
  await clearProcedureMaterials(clinicId, id);
  await deleteProcedure(clinicId, id);
}
