"use server";

import { revalidatePath } from "next/cache";
import { addMaterial, removeMaterial, updateMaterialItem } from "@/server/services/materials";

export async function addMaterialAction(formData: FormData) {
  await addMaterial({
    name: String(formData.get("name") || ""),
    unit: String(formData.get("unit") || "un"),
    current_stock: Number(formData.get("current_stock") || 0),
    min_stock: Number(formData.get("min_stock") || 0),
  });
  revalidatePath("/dashboard/materials");
}

export async function updateMaterialAction(formData: FormData) {
  await updateMaterialItem({
    id: String(formData.get("material_id") || ""),
    name: String(formData.get("name") || ""),
    unit: String(formData.get("unit") || "un"),
    current_stock: Number(formData.get("current_stock") || 0),
    min_stock: Number(formData.get("min_stock") || 0),
  });
  revalidatePath("/dashboard/materials");
}

export async function deleteMaterialAction(formData: FormData) {
  await removeMaterial(String(formData.get("material_id") || ""));
  revalidatePath("/dashboard/materials");
}
