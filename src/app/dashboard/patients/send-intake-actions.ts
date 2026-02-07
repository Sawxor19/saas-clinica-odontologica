"use server";

import crypto from "crypto";
import { getClinicContext } from "@/server/auth/context";
import { supabaseServerClient } from "@/server/db/supabaseServer";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { sendWhatsAppMessage } from "@/server/notifications/whatsapp";

export async function sendIntakeLinkAction(formData: FormData) {
  const phone = String(formData.get("phone") || "").trim();
  if (!phone) throw new Error("Telefone obrigatório");

  const { clinicId } = await getClinicContext();
  const admin = supabaseAdmin();
  const supabase = await supabaseServerClient();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("whatsapp_number")
    .eq("id", clinicId)
    .single();

  if (!clinic?.whatsapp_number) {
    throw new Error("WhatsApp da clínica não configurado");
  }

  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

  const { data: patient } = await admin
    .from("patients")
    .insert({
      clinic_id: clinicId,
      full_name: "Paciente (pendente)",
      phone,
      status: "intake_pending",
    })
    .select("id")
    .single();

  await admin.from("patient_intake_links").insert({
    clinic_id: clinicId,
    phone,
    token,
    expires_at: expiresAt.toISOString(),
    patient_id: patient?.id ?? null,
  });

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/patient-intake/${token}`;
  await sendWhatsAppMessage({
    to: phone,
    from: clinic.whatsapp_number,
    body: `Olá! Para agilizar seu atendimento, preencha seu cadastro: ${url}`,
  });
}
