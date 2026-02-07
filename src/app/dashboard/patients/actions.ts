"use server";

import { revalidatePath } from "next/cache";
import { addPatient, removePatient, updatePatientItem } from "@/server/services/patients";

export async function addPatientAction(formData: FormData) {
  await addPatient({
    full_name: String(formData.get("full_name") || ""),
    email: String(formData.get("email") || ""),
    phone: String(formData.get("phone") || ""),
    birth_date: String(formData.get("birth_date") || ""),
    notes: String(formData.get("notes") || ""),
    cpf: String(formData.get("cpf") || ""),
    address: String(formData.get("address") || ""),
    cep: String(formData.get("cep") || ""),
    emergency_contact: String(formData.get("emergency_contact") || ""),
    allergies: String(formData.get("allergies") || ""),
    chronic_conditions: String(formData.get("chronic_conditions") || ""),
    medications: String(formData.get("medications") || ""),
    alerts: String(formData.get("alerts") || ""),
    dentist_id: String(formData.get("dentist_id") || ""),
  });
  revalidatePath("/dashboard/patients");
}

export async function deletePatientAction(formData: FormData) {
  const patientId = String(formData.get("patient_id") || "");
  if (patientId) {
    await removePatient(patientId);
    revalidatePath("/dashboard/patients");
  }
}

export async function updatePatientAction(formData: FormData) {
  const patientId = String(formData.get("patient_id") || "");
  if (!patientId) return;
  await updatePatientItem(patientId, {
    full_name: String(formData.get("full_name") || ""),
    email: String(formData.get("email") || ""),
    phone: String(formData.get("phone") || ""),
    birth_date: String(formData.get("birth_date") || ""),
    notes: String(formData.get("notes") || ""),
    cpf: String(formData.get("cpf") || ""),
    address: String(formData.get("address") || ""),
    cep: String(formData.get("cep") || ""),
    emergency_contact: String(formData.get("emergency_contact") || ""),
    allergies: String(formData.get("allergies") || ""),
    chronic_conditions: String(formData.get("chronic_conditions") || ""),
    medications: String(formData.get("medications") || ""),
    alerts: String(formData.get("alerts") || ""),
    status: (String(formData.get("status") || "active") as
      | "active"
      | "inactive"
      | "intake_pending"),
    dentist_id: String(formData.get("dentist_id") || ""),
  });
  revalidatePath("/dashboard/patients");
}
