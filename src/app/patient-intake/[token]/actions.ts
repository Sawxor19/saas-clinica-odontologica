"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { patientSchema } from "@/types/schemas";
import { verifyCaptcha } from "@/app/patient-intake/[token]/captcha";

const BUCKET = "clinic-attachments";

function normalizeBirthDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) return trimmed;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function decodeDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Assinatura inválida");
  }
  const [, mime, base64] = match;
  return {
    mime,
    buffer: Buffer.from(base64, "base64"),
  };
}

function sanitizeFileName(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.replace(/[^\w.\-]+/g, "_") : "arquivo";
}

async function uploadIntakeFile(input: {
  admin: ReturnType<typeof supabaseAdmin>;
  clinicId: string;
  patientId: string;
  fileBody: Blob | ArrayBuffer | Uint8Array;
  fileName: string;
  contentType?: string;
  category: string;
}) {
  const safeName = sanitizeFileName(input.fileName);
  const path = `${input.clinicId}/${input.patientId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await input.admin.storage
    .from(BUCKET)
    .upload(path, input.fileBody, {
      upsert: true,
      contentType: input.contentType,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: insertError } = await input.admin.from("attachments").insert({
    clinic_id: input.clinicId,
    patient_id: input.patientId,
    file_path: path,
    file_name: safeName,
    category: input.category,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return path;
}

export async function submitPatientIntake(token: string, formData: FormData) {
  const admin = supabaseAdmin();
  const { data: link, error } = await admin
    .from("patient_intake_links")
    .select("clinic_id, phone, expires_at, used_at, patient_id")
    .eq("token", token)
    .single();

  if (error || !link || link.used_at || new Date(link.expires_at) < new Date()) {
    throw new Error("Link inválido ou expirado");
  }

  const captchaValid = verifyCaptcha({
    a: Number(formData.get("captcha_a") || 0),
    b: Number(formData.get("captcha_b") || 0),
    token: String(formData.get("captcha_token") || ""),
    answer: String(formData.get("captcha_answer") || ""),
  });

  if (!captchaValid) {
    throw new Error("Captcha inválido");
  }

  const birthDate = normalizeBirthDate(String(formData.get("birth_date") || ""));
  const phoneInput = String(formData.get("phone") || "").trim();

  if (!phoneInput && !link.phone) {
    throw new Error("Telefone obrigat?rio");
  }

  const input = patientSchema.parse({
    full_name: String(formData.get("full_name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: phoneInput || link.phone || "",
    birth_date: birthDate,
    cpf: String(formData.get("cpf") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    cep: String(formData.get("cep") || "").trim(),
    emergency_contact: String(formData.get("emergency_contact") || "").trim(),
  });

  const patientPayload = {
    full_name: input.full_name,
    email: input.email || null,
    phone: input.phone || null,
    birth_date: input.birth_date || null,
    cpf: input.cpf || null,
    address: input.address || null,
    cep: input.cep || null,
    emergency_contact: input.emergency_contact || null,
    status: "active" as const,
  };

  let patientId = link.patient_id;
  if (patientId) {
    const { error: updateError } = await admin
      .from("patients")
      .update(patientPayload)
      .eq("id", patientId);
    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { data: patient, error: insertError } = await admin
      .from("patients")
      .insert({
        clinic_id: link.clinic_id,
        ...patientPayload,
      })
      .select("id")
      .single();

    if (insertError || !patient) {
      throw new Error(insertError?.message || "Erro ao criar paciente");
    }
    patientId = patient.id;
  }

  const signatureData = String(formData.get("signature_data") || "");
  if (!signatureData) {
    throw new Error("Assinatura obrigatória");
  }

  const signature = decodeDataUrl(signatureData);
  const signaturePath = await uploadIntakeFile({
    admin,
    clinicId: link.clinic_id,
    patientId,
    fileBody: signature.buffer,
    fileName: "assinatura.png",
    contentType: signature.mime,
    category: "signature",
  });

  const mediaUpdate: { signature_path: string } = {
    signature_path: signaturePath,
  };

  const { error: mediaError } = await admin
    .from("patients")
    .update(mediaUpdate)
    .eq("id", patientId);
  if (mediaError) {
    throw new Error(mediaError.message);
  }

  await admin
    .from("patient_intake_links")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  redirect("/patient-intake/success");
}
