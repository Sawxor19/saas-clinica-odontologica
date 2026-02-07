"use server";

import { revalidatePath } from "next/cache";
import { addPayable, removePayable, updatePayableItem } from "@/server/services/payables";

export async function addPayableAction(formData: FormData) {
  await addPayable({
    name: String(formData.get("name") || ""),
    amount: Number(formData.get("amount") || 0),
    due_date: String(formData.get("due_date") || ""),
    payment_method: String(formData.get("payment_method") || ""),
    installments: formData.get("installments")
      ? Number(formData.get("installments"))
      : null,
    is_paid: String(formData.get("is_paid") || "false") === "true",
  });
  revalidatePath("/dashboard/finance");
}

export async function updatePayableAction(formData: FormData) {
  await updatePayableItem({
    id: String(formData.get("payable_id") || ""),
    name: String(formData.get("name") || ""),
    amount: Number(formData.get("amount") || 0),
    due_date: String(formData.get("due_date") || ""),
    payment_method: String(formData.get("payment_method") || ""),
    installments: formData.get("installments")
      ? Number(formData.get("installments"))
      : null,
    is_paid: String(formData.get("is_paid") || "false") === "true",
  });
  revalidatePath("/dashboard/finance");
}

export async function deletePayableAction(formData: FormData) {
  const id = String(formData.get("payable_id") || "");
  if (!id) return;
  await removePayable(id);
  revalidatePath("/dashboard/finance");
}
