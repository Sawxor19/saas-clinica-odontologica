import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { supabaseServerClient } from "@/server/db/supabaseServer";
import { listPatientsByIds } from "@/server/repositories/patients";
import { listUpcomingAppointments, listCompletedAppointmentsForFollowUp } from "@/server/repositories/appointments";
import { sendWhatsAppMessage } from "@/server/notifications/whatsapp";
import { sendSmsMessage } from "@/server/notifications/sms";
import { auditLog } from "@/server/audit/auditLog";
import { formatDateTimeInZone, normalizeTimeZone } from "@/lib/timezone";

function addHours(date: Date, hours: number) {
  const copy = new Date(date);
  copy.setHours(copy.getHours() + hours);
  return copy;
}

export async function sendAutomaticReminders() {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "readSchedule");

  const now = new Date();
  const upcomingStart = addHours(now, 18);
  const upcomingEnd = addHours(now, 26);
  const followStart = addHours(now, -24);
  const followEnd = addHours(now, -2);

  const [upcoming, completed] = await Promise.all([
    listUpcomingAppointments(clinicId, upcomingStart.toISOString(), upcomingEnd.toISOString()),
    listCompletedAppointmentsForFollowUp(clinicId, followStart.toISOString(), followEnd.toISOString()),
  ]);

  const patientIds = Array.from(new Set([...upcoming, ...completed].map((item) => item.patient_id)));
  const patients = await listPatientsByIds(clinicId, patientIds);
  const patientMap = new Map(patients.map((item) => [item.id, item]));

  const supabase = await supabaseServerClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("whatsapp_number, timezone")
    .eq("id", clinicId)
    .single();
  const timeZone = normalizeTimeZone(clinic?.timezone);

  const results: Array<{ id: string; type: string; channel: string; success: boolean }> = [];

  for (const appointment of upcoming) {
    const patient = patientMap.get(appointment.patient_id);
    if (!patient?.phone) continue;

    const scheduledAt = formatDateTimeInZone(new Date(appointment.starts_at), timeZone);
    const message =
      appointment.status === "confirmed"
        ? `Ola ${patient.full_name}, sua consulta confirmada esta marcada para ${scheduledAt}.`
        : `Ola ${patient.full_name}, sua consulta esta agendada para ${scheduledAt}. Responda SIM para confirmar ou NAO para reagendar.`;

    if (clinic?.whatsapp_number) {
      try {
        await sendWhatsAppMessage({ to: patient.phone, from: clinic.whatsapp_number, body: message });
        results.push({ id: appointment.id, type: "reminder", channel: "whatsapp", success: true });
      } catch {
        results.push({ id: appointment.id, type: "reminder", channel: "whatsapp", success: false });
      }
    }

    try {
      await sendSmsMessage({ to: patient.phone, body: message });
      results.push({ id: appointment.id, type: "reminder", channel: "sms", success: true });
    } catch {
      results.push({ id: appointment.id, type: "reminder", channel: "sms", success: false });
    }
  }

  for (const appointment of completed) {
    const patient = patientMap.get(appointment.patient_id);
    if (!patient?.phone) continue;

    const message = `Ola ${patient.full_name}, esperamos que tenha ficado satisfeito(a) com sua consulta. Precisa de algo?`;

    if (clinic?.whatsapp_number) {
      try {
        await sendWhatsAppMessage({ to: patient.phone, from: clinic.whatsapp_number, body: message });
        results.push({ id: appointment.id, type: "follow_up", channel: "whatsapp", success: true });
      } catch {
        results.push({ id: appointment.id, type: "follow_up", channel: "whatsapp", success: false });
      }
    }

    try {
      await sendSmsMessage({ to: patient.phone, body: message });
      results.push({ id: appointment.id, type: "follow_up", channel: "sms", success: true });
    } catch {
      results.push({ id: appointment.id, type: "follow_up", channel: "sms", success: false });
    }
  }

  await auditLog({
    clinicId,
    userId,
    action: "reminders.run",
    entity: "appointment",
    metadata: { count: results.length },
  });

  return results;
}
