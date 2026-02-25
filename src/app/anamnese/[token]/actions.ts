"use server";

import { redirect } from "next/navigation";
import { verifyCaptcha } from "@/app/patient-intake/[token]/captcha";
import {
  findPatientByCpf,
  insertAnamnesisSubmission,
  markAnamnesisLinkUsed,
  updatePatientSignaturePath,
} from "@/server/repositories/anamnesis";
import { getPublicAnamnesisByToken } from "@/server/services/anamnesis";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

const BUCKET = "clinic-attachments";

type Question = {
  id: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "boolean" | "single_choice" | "multiple_choice";
  required?: boolean;
  options?: string[];
};

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeCpf(value: string) {
  return value.replace(/\D/g, "");
}

function sanitizeFileName(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.replace(/[^\w.\-]+/g, "_") : "arquivo";
}

function decodeDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Assinatura digital invalida.");
  }
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function questionFieldName(questionId: string) {
  return `question_${questionId}`;
}

function extractAnswers(formData: FormData, questions: Question[]) {
  const answers: Record<string, unknown> = {};

  for (const question of questions) {
    const fieldName = questionFieldName(question.id);
    const required = Boolean(question.required);

    if (question.type === "multiple_choice") {
      const values = formData
        .getAll(fieldName)
        .map((item) => String(item || "").trim())
        .filter(Boolean);
      if (required && values.length === 0) {
        throw new Error(`A pergunta "${question.label}" e obrigatoria.`);
      }
      answers[question.id] = values;
      continue;
    }

    if (question.type === "boolean") {
      const checked = String(formData.get(fieldName) || "") === "true";
      if (required && !checked) {
        throw new Error(`A pergunta "${question.label}" e obrigatoria.`);
      }
      answers[question.id] = checked;
      continue;
    }

    const rawValue = String(formData.get(fieldName) || "").trim();
    if (required && !rawValue) {
      throw new Error(`A pergunta "${question.label}" e obrigatoria.`);
    }

    if (!rawValue) {
      answers[question.id] = "";
      continue;
    }

    if (question.type === "number") {
      const numberValue = Number(rawValue);
      if (!Number.isFinite(numberValue)) {
        throw new Error(`Valor invalido para "${question.label}".`);
      }
      answers[question.id] = numberValue;
      continue;
    }

    answers[question.id] = rawValue;
  }

  return answers;
}

async function uploadSignature(input: {
  clinicId: string;
  patientId: string;
  signatureData: string;
}) {
  const admin = supabaseAdmin();
  const parsed = decodeDataUrl(input.signatureData);
  const fileName = sanitizeFileName(`anamnese-${Date.now()}.png`);
  const path = `${input.clinicId}/${input.patientId}/${fileName}`;

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, parsed.buffer, {
    upsert: true,
    contentType: parsed.mime,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await admin.from("attachments").insert({
    clinic_id: input.clinicId,
    patient_id: input.patientId,
    file_path: path,
    file_name: fileName,
    category: "signature_anamnesis",
  });
  if (insertError) throw new Error(insertError.message);

  return path;
}

export async function submitAnamnesis(token: string, formData: FormData) {
  try {
    const link = await getPublicAnamnesisByToken(token);
    if (!link) {
      throw new Error("Link invalido ou expirado.");
    }

    const captchaValid = verifyCaptcha({
      a: Number(formData.get("captcha_a") || 0),
      b: Number(formData.get("captcha_b") || 0),
      token: String(formData.get("captcha_token") || ""),
      answer: String(formData.get("captcha_answer") || ""),
    });
    if (!captchaValid) {
      throw new Error("Captcha invalido.");
    }

    const fullName = String(formData.get("full_name") || "").trim();
    const cpfInput = String(formData.get("cpf") || "").trim();
    const cpfDigits = normalizeCpf(cpfInput);
    const signedDate = String(formData.get("signed_date") || "").trim();
    const confirmIdentity = String(formData.get("confirm_identity") || "") === "true";
    const signatureData = String(formData.get("signature_data") || "");

    if (!fullName) throw new Error("Nome obrigatorio.");
    if (cpfDigits.length !== 11) throw new Error("CPF invalido.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(signedDate)) throw new Error("Data de assinatura invalida.");
    if (!confirmIdentity) throw new Error("E necessario confirmar os dados.");
    if (!signatureData) throw new Error("Assinatura digital obrigatoria.");

    const questions = (link.template?.questions as Question[] | null) ?? [];
    const answers = extractAnswers(formData, questions);

    const patientFromCpf = await findPatientByCpf(link.clinic_id as string, cpfDigits);
    const linkedPatient = (link.patient as { id?: string; full_name?: string | null; cpf?: string | null; signature_path?: string | null } | null) ?? null;
    const patient = linkedPatient?.id ? linkedPatient : patientFromCpf;

    if (!patient?.id) {
      throw new Error("Nao encontramos paciente com este CPF no cadastro da clinica.");
    }

    const registeredCpfDigits = normalizeCpf(String(patient.cpf ?? ""));
    if (!registeredCpfDigits || registeredCpfDigits !== cpfDigits) {
      throw new Error("CPF nao confere com o cadastro do paciente.");
    }

    const registeredName = normalizeName(String(patient.full_name ?? ""));
    const informedName = normalizeName(fullName);
    if (!registeredName || registeredName !== informedName) {
      throw new Error("Nome informado nao confere com o cadastro.");
    }

    const signaturePath = await uploadSignature({
      clinicId: link.clinic_id as string,
      patientId: String(patient.id),
      signatureData,
    });

    if (!patient.signature_path) {
      await updatePatientSignaturePath(String(patient.id), signaturePath);
    }

    await insertAnamnesisSubmission({
      clinicId: link.clinic_id as string,
      templateId: link.template_id as string,
      linkId: link.id as string,
      patientId: String(patient.id),
      fullName,
      cpf: cpfInput,
      signedDate,
      answers,
      signaturePath,
      identityVerified: true,
    });

    await markAnamnesisLinkUsed(link.id as string);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao enviar anamnese.";
    redirect(`/anamnese/${token}?error=${encodeURIComponent(message)}`);
  }

  redirect("/anamnese/success");
}
