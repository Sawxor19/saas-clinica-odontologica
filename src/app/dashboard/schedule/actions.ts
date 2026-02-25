"use server";

import { revalidatePath } from "next/cache";
import {
  addAppointment,
  removeAppointment,
  rescheduleAppointmentItem,
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

function normalizeDateTime(value: string, clinicTimezone: string) {
  if (!value) return value;
  const hasOffset = /[zZ]|[+-]\d{2}:\d{2}$/.test(value);
  if (hasOffset) {
    return new Date(value).toISOString();
  }
  const parts = parseDateTimeLocal(value);
  if (!parts) return value;
  return zonedTimeToUtc(parts, clinicTimezone).toISOString();
}

async function getAppointmentNotificationData(clinicId: string, appointmentId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, patient_id, starts_at")
    .eq("clinic_id", clinicId)
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

async function sendAppointmentWhatsApp(params: {
  clinicId: string;
  patientId: string;
  startsAtIso: string;
  bodyPrefix: string;
}) {
  const supabase = await supabaseServerClient();
  const [{ data: clinic }, { data: patient }] = await Promise.all([
    supabase
      .from("clinics")
      .select("whatsapp_number, timezone")
      .eq("id", params.clinicId)
      .single(),
    supabase
      .from("patients")
      .select("phone, full_name")
      .eq("id", params.patientId)
      .single(),
  ]);

  if (!clinic?.whatsapp_number || !patient?.phone) return;

  const timeZone = normalizeTimeZone(clinic.timezone);
  const startsAt = params.startsAtIso ? new Date(params.startsAtIso) : null;
  const scheduledAt = startsAt ? formatDateTimeInZone(startsAt, timeZone) : params.startsAtIso;

  await sendWhatsAppMessage({
    to: patient.phone,
    from: clinic.whatsapp_number,
    body: `${params.bodyPrefix} ${patient.full_name}, horario: ${scheduledAt}. Responda SIM para confirmar ou NAO para reagendar.`,
  });
}

export async function createAppointmentAction(formData: FormData) {
  const { clinicId } = await getClinicContext();
  const clinicTimezone = normalizeTimeZone(await getClinicTimezone(clinicId));

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
    starts_at: normalizeDateTime(String(formData.get("starts_at") || ""), clinicTimezone),
    ends_at: normalizeDateTime(String(formData.get("ends_at") || ""), clinicTimezone),
    status,
    charge_amount: Number(formData.get("charge_amount") || 0),
    notes: String(formData.get("notes") || ""),
  } satisfies AppointmentInput;

  await addAppointment(input);

  try {
    await sendAppointmentWhatsApp({
      clinicId,
      patientId: input.patient_id,
      startsAtIso: input.starts_at,
      bodyPrefix: "Ola",
    });
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

  if (status === "confirmed") {
    try {
      const { clinicId } = await getClinicContext();
      const appointment = await getAppointmentNotificationData(clinicId, appointmentId);
      if (appointment) {
        await sendAppointmentWhatsApp({
          clinicId,
          patientId: appointment.patient_id,
          startsAtIso: appointment.starts_at,
          bodyPrefix: "Consulta confirmada para",
        });
      }
    } catch {
      // ignore notification failures
    }
  }

  revalidatePath("/dashboard/schedule");
}

export async function rescheduleAppointmentAction(formData: FormData) {
  const appointmentId = String(formData.get("appointment_id") || "");
  if (!appointmentId) return;

  const { clinicId } = await getClinicContext();
  const clinicTimezone = normalizeTimeZone(await getClinicTimezone(clinicId));

  const startsAt = normalizeDateTime(String(formData.get("starts_at") || ""), clinicTimezone);
  const endsAt = normalizeDateTime(String(formData.get("ends_at") || ""), clinicTimezone);

  await rescheduleAppointmentItem({
    appointmentId,
    starts_at: startsAt,
    ends_at: endsAt,
  });

  try {
    const appointment = await getAppointmentNotificationData(clinicId, appointmentId);
    if (appointment) {
      await sendAppointmentWhatsApp({
        clinicId,
        patientId: appointment.patient_id,
        startsAtIso: startsAt,
        bodyPrefix: "Seu agendamento foi atualizado. Novo horario para",
      });
    }
  } catch {
    // ignore notification failures
  }

  revalidatePath("/dashboard/schedule");
}

export async function deleteAppointmentAction(formData: FormData) {
  const appointmentId = String(formData.get("appointment_id") || "");
  if (!appointmentId) return;
  await removeAppointment(appointmentId);
  revalidatePath("/dashboard/schedule");
}
