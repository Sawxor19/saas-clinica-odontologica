"use server";

import { revalidatePath } from "next/cache";
import { addProcedure, removeProcedure, updateProcedureWithMaterials } from "@/server/services/procedures";

function parseDecimalInput(value: FormDataEntryValue | null) {
  if (!value) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.,-]/g, "");
  if (!cleaned) return 0;
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = cleaned.replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function addProcedureAction(formData: FormData) {
  const materialIds = formData.getAll("material_id").map(String).filter(Boolean);
  const quantities = formData.getAll("quantity").map((value) => Number(value));
  await addProcedure({
    name: String(formData.get("name") || ""),
    price: parseDecimalInput(formData.get("price")),
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
    price: parseDecimalInput(formData.get("price")),
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
