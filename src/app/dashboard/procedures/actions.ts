"use server";

import { revalidatePath } from "next/cache";
import { addProcedure, removeProcedure, updateProcedureWithMaterials } from "@/server/services/procedures";

export async function addProcedureAction(formData: FormData) {
  const materialIds = formData.getAll("material_id").map(String).filter(Boolean);
  const quantities = formData.getAll("quantity").map((value) => Number(value));
  await addProcedure({
    name: String(formData.get("name") || ""),
    price: Number(formData.get("price") || 0),
    materials: materialIds.map((id, index) => ({
      material_id: id,
      quantity: quantities[index] || 0,
    })),
  });
  revalidatePath("/dashboard/procedures");
}

export async function updateProcedureAction(formData: FormData) {
  const materialIds = formData.getAll("material_id").map(String).filter(Boolean);
  const quantities = formData.getAll("quantity").map((value) => Number(value));
  await updateProcedureWithMaterials({
    id: String(formData.get("procedure_id") || ""),
    name: String(formData.get("name") || ""),
    price: Number(formData.get("price") || 0),
    materials: materialIds.map((id, index) => ({
      material_id: id,
      quantity: quantities[index] || 0,
    })),
  });
  revalidatePath("/dashboard/procedures");
}

export async function deleteProcedureAction(formData: FormData) {
  const id = String(formData.get("procedure_id") || "");
  if (!id) return;
  await removeProcedure(id);
  revalidatePath("/dashboard/procedures");
}
