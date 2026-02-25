"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { anamnesisService } from "@/server/services/anamneses";

function safeStatus(value: string) {
  if (value === "draft" || value === "published" || value === "archived") return value;
  return "draft";
}

export async function createAnamnesisAction(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const form = await anamnesisService.createForm(title);
  revalidatePath("/anamneses");
  redirect(`/anamneses/${form.id}`);
}

export async function setAnamnesisStatusAction(formData: FormData) {
  const formId = String(formData.get("form_id") || "");
  if (!formId) return;
  const status = safeStatus(String(formData.get("status") || ""));
  await anamnesisService.setFormStatus(formId, status);
  revalidatePath("/anamneses");
  revalidatePath(`/anamneses/${formId}`);
}
