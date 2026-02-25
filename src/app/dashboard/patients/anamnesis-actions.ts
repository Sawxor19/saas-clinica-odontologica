"use server";

import { revalidatePath } from "next/cache";
import { addAnamnesisTemplate, generateAnamnesisLink } from "@/server/services/anamnesis";

type ActionResult =
  | { ok: true; url?: string; template?: { id: string; title: string } }
  | { ok: false; error: string };

export async function createAnamnesisTemplateAction(formData: FormData): Promise<ActionResult> {
  try {
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const rawQuestions = String(formData.get("questions_json") || "[]");
    const questions = JSON.parse(rawQuestions);

    const template = await addAnamnesisTemplate({
      title,
      description: description || null,
      questions,
    });

    revalidatePath("/dashboard/patients");

    return {
      ok: true,
      template: {
        id: template.id as string,
        title: String(template.title ?? title),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao criar anamnese.";
    return { ok: false, error: message };
  }
}

export async function generateAnamnesisLinkAction(formData: FormData): Promise<ActionResult> {
  try {
    const templateId = String(formData.get("template_id") || "");
    const patientId = String(formData.get("patient_id") || "");
    const expiresInHours = Number(formData.get("expires_in_hours") || 72);

    const url = await generateAnamnesisLink({
      templateId,
      patientId: patientId || null,
      expiresInHours: Number.isFinite(expiresInHours) ? expiresInHours : 72,
    });

    revalidatePath("/dashboard/patients");
    return { ok: true, url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar link.";
    return { ok: false, error: message };
  }
}
