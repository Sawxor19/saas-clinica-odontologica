"use server";

import { redirect } from "next/navigation";
import { supabaseServerClient } from "@/server/db/supabaseServer";
import { getClinicContext } from "@/server/auth/context";

export async function updateProfileAction(formData: FormData) {
  const { clinicId, userId } = await getClinicContext();
  const supabase = await supabaseServerClient();

  const fullName = String(formData.get("full_name") || "").trim();
  const cpf = String(formData.get("cpf") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const cep = String(formData.get("cep") || "").trim();
  const clinicName = String(formData.get("clinic_name") || "").trim();
  const whatsappNumber = String(formData.get("whatsapp_number") || "").trim();
  const timezone = String(formData.get("timezone") || "").trim();

  await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      cpf: cpf || null,
      address: address || null,
      cep: cep || null,
    })
    .eq("user_id", userId);

  await supabase
    .from("clinics")
    .update({
      name: clinicName || null,
      whatsapp_number: whatsappNumber || null,
      timezone: timezone || null,
    })
    .eq("id", clinicId);

  redirect("/dashboard/profile");
}
