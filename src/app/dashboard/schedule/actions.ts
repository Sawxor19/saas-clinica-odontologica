"use server";

import { revalidatePath } from "next/cache";
import {
  addAppointment,
  removeAppointment,
  updateAppointmentStatusItem,
} from "@/server/services/appointments";
import { supabaseServerClient } from "@/server/db/supabaseServer";
import { getClinicContext } from "@/server/auth/context";
import { sendWhatsAppMessage } from "@/server/notifications/whatsapp";
import { getClinicTimezone } from "@/server/repositories/clinics";
import {
  formatDateTimeInZone,
  normalizeTimeZone,
  parseDateTimeLocal,
  zonedTimeToUtc,
} from "@/lib/timezone";
import { AppointmentInput } from "@/types/schemas";

const APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "arrived",
  "in_progress",
  "completed",
  "missed",
  "cancelled",
] as const;

type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export async function createAppointmentAction(formData: FormData) {
  const { clinicId } = await getClinicContext();
  const clinicTimezone = normalizeTimeZone(await getClinicTimezone(clinicId));

  const normalizeDateTime = (value: string) => {
    if (!value) return value;
    const hasOffset = /[zZ]|[+-]\d{2}:\d{2}$/.test(value);
    if (hasOffset) {
      return new Date(value).toISOString();
    }
    const parts = parseDateTimeLocal(value);
    if (!parts) return value;
    return zonedTimeToUtc(parts, clinicTimezone).toISOString();
  };

  const rawStatus = String(formData.get("status") || "scheduled");
  const status: AppointmentStatus = APPOINTMENT_STATUSES.includes(
    rawStatus as AppointmentStatus
  )
    ? (rawStatus as AppointmentStatus)
    : "scheduled";

  const input = {
    patient_id: String(formData.get("patient_id") || ""),
    dentist_id: String(formData.get("dentist_id") || ""),
    procedure_id: String(formData.get("procedure_id") || ""),
    room_id: String(formData.get("room_id") || ""),
    starts_at: normalizeDateTime(String(formData.get("starts_at") || "")),
    ends_at: normalizeDateTime(String(formData.get("ends_at") || "")),
    status,
    charge_amount: Number(formData.get("charge_amount") || 0),
    notes: String(formData.get("notes") || ""),
  } satisfies AppointmentInput;
  await addAppointment(input);

  try {
    const supabase = await supabaseServerClient();
    const { data: clinic } = await supabase
      .from("clinics")
      .select("whatsapp_number, timezone")
      .eq("id", clinicId)
      .single();
    const { data: patient } = await supabase
      .from("patients")
      .select("phone, full_name")
      .eq("id", input.patient_id)
      .single();
    if (clinic?.whatsapp_number && patient?.phone) {
      const timeZone = normalizeTimeZone(clinic.timezone);
      const startsAt = input.starts_at ? new Date(input.starts_at) : null;
      await sendWhatsAppMessage({
        to: patient.phone,
        from: clinic.whatsapp_number,
        body: `Ol? ${patient.full_name}, sua consulta foi agendada para ${
          startsAt ? formatDateTimeInZone(startsAt, timeZone) : input.starts_at
        }.`,
      });
    }
  } catch {
    // ignore notification failures
  }
  revalidatePath("/dashboard/schedule");
}

export async function updateAppointmentStatusAction(formData: FormData) {
  const appointmentId = String(formData.get("appointment_id") || "");
  const rawStatus = String(formData.get("status") || "scheduled");
  const status: AppointmentStatus = APPOINTMENT_STATUSES.includes(
    rawStatus as AppointmentStatus
  )
    ? (rawStatus as AppointmentStatus)
    : "scheduled";
  const paymentStatus = String(formData.get("payment_status") || "");
  const paymentMethod = String(formData.get("payment_method") || "");
  if (!appointmentId) return;

  await updateAppointmentStatusItem({
    appointmentId,
    status,
    payment_status: paymentStatus || null,
    payment_method: paymentMethod || null,
    paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
  });
  revalidatePath("/dashboard/schedule");
}

export async function deleteAppointmentAction(formData: FormData) {
  const appointmentId = String(formData.get("appointment_id") || "");
  if (!appointmentId) return;
  await removeAppointment(appointmentId);
  revalidatePath("/dashboard/schedule");
}
