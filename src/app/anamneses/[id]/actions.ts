"use server";

import { revalidatePath } from "next/cache";
import { anamnesisService } from "@/server/services/anamneses";

type BuilderFieldPayload = {
  label: string;
  help_text?: string | null;
  type:
    | "text"
    | "textarea"
    | "select"
    | "radio"
    | "checkbox"
    | "date"
    | "yes_no"
    | "number";
  required?: boolean;
  order_index?: number;
  options?: string[] | null;
  validation?: Record<string, unknown> | null;
};

type BuilderPayload = {
  title: string;
  description?: string | null;
  fields: BuilderFieldPayload[];
};

function parseIntent(value: string) {
  if (value === "publish" || value === "archive" || value === "save") return value;
  return "save";
}

export async function saveAnamnesisBuilderAction(formId: string, formData: FormData) {
  const rawPayload = String(formData.get("payload") || "{}");
  const intent = parseIntent(String(formData.get("intent") || "save"));

  let payload: BuilderPayload;
  try {
    payload = JSON.parse(rawPayload) as BuilderPayload;
  } catch {
    throw new Error("Payload invalido");
  }

  await anamnesisService.saveForm(formId, {
    title: payload.title,
    description: payload.description ?? null,
    fields: payload.fields ?? [],
    intent,
  });

  revalidatePath("/anamneses");
  revalidatePath(`/anamneses/${formId}`);
}
