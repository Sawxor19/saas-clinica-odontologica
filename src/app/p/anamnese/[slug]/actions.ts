"use server";

import { redirect } from "next/navigation";
import { anamnesisService } from "@/server/services/anamneses";

type AnswersMap = Record<string, unknown>;

function parseAnswers(raw: string): AnswersMap {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as AnswersMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function submitPublicAnamnesisAction(slug: string, formData: FormData) {
  const answersJson = String(formData.get("answers_json") || "{}");
  const payload = {
    patient_name: String(formData.get("patient_name") || "").trim(),
    patient_email: String(formData.get("patient_email") || "").trim(),
    signature_data: String(formData.get("signature_data") || ""),
    answers: parseAnswers(answersJson),
  };

  await anamnesisService.submitPublicForm(slug, payload);
  redirect(`/p/anamnese/${slug}?success=1`);
}
