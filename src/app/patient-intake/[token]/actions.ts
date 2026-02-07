"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { patientSchema } from "@/types/schemas";

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

  const input = patientSchema.parse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: link.phone,
    birth_date: formData.get("birth_date"),
    cpf: formData.get("cpf"),
    address: formData.get("address"),
    cep: formData.get("cep"),
    emergency_contact: formData.get("emergency_contact"),
    allergies: formData.get("allergies"),
    chronic_conditions: formData.get("chronic_conditions"),
    medications: formData.get("medications"),
    alerts: formData.get("alerts"),
    notes: formData.get("notes"),
  });

  if (link.patient_id) {
    await admin
      .from("patients")
      .update({
        full_name: input.full_name,
        email: input.email || null,
        phone: input.phone || null,
        birth_date: input.birth_date || null,
        cpf: input.cpf || null,
        address: input.address || null,
        cep: input.cep || null,
        emergency_contact: input.emergency_contact || null,
        allergies: input.allergies || null,
        chronic_conditions: input.chronic_conditions || null,
        medications: input.medications || null,
        alerts: input.alerts || null,
        notes: input.notes || null,
        status: "active",
      })
      .eq("id", link.patient_id);
  } else {
    await admin.from("patients").insert({
      clinic_id: link.clinic_id,
      full_name: input.full_name,
      email: input.email || null,
      phone: input.phone || null,
      birth_date: input.birth_date || null,
      cpf: input.cpf || null,
      address: input.address || null,
      cep: input.cep || null,
      emergency_contact: input.emergency_contact || null,
      allergies: input.allergies || null,
      chronic_conditions: input.chronic_conditions || null,
      medications: input.medications || null,
      alerts: input.alerts || null,
      notes: input.notes || null,
      status: "active",
    });
  }

  await admin
    .from("patient_intake_links")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  redirect("/patient-intake/success");
}
