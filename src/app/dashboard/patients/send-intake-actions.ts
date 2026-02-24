"use server";

import crypto from "crypto";
import { getClinicContext } from "@/server/auth/context";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { getAppUrl } from "@/server/config/app-url";

type IntakeLinkResult = { ok: true; url: string } | { ok: false; error: string };

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function sendIntakeLinkAction(formData: FormData): Promise<IntakeLinkResult> {
  try {
    const rawPhone = String(formData.get("phone") || "").trim();
    const digits = rawPhone ? normalizePhone(rawPhone) : "";
    if (rawPhone && digits.length < 10) {
      return { ok: false, error: "Telefone inválido" };
    }

    const phone = rawPhone || null;

    const { clinicId } = await getClinicContext();
    const admin = supabaseAdmin();

    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const { data: patient, error: patientError } = await admin
      .from("patients")
      .insert({
        clinic_id: clinicId,
        full_name: "Paciente (pendente)",
        phone,
        status: "intake_pending",
      })
      .select("id")
      .single();

    if (patientError) {
      return { ok: false, error: patientError.message };
    }

    const { error: linkError } = await admin.from("patient_intake_links").insert({
      clinic_id: clinicId,
      phone,
      token,
      expires_at: expiresAt.toISOString(),
      patient_id: patient?.id ?? null,
    });

    if (linkError) {
      return { ok: false, error: linkError.message };
    }

    const appUrl = getAppUrl();

    return { ok: true, url: `${appUrl}/patient-intake/${token}` };
  } catch (error) {
    console.error("sendIntakeLinkAction error", error);
    const message = error instanceof Error ? error.message : "Falha ao gerar link";
    return { ok: false, error: message };
  }
}
