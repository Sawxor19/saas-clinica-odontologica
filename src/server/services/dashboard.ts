import { getClinicContext } from "@/server/auth/context";
import {
  countAppointments,
  countBudgetsByStatus,
  sumAppointmentPayments,
} from "@/server/repositories/metrics";
import { listAppointments } from "@/server/repositories/appointments";
import { listPatientsByIds } from "@/server/repositories/patients";

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

function todayRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  return { start, end };
}

export async function getDashboardData() {
  const { clinicId, permissions, userId, role } = await getClinicContext();
  const { start: monthStart, end: monthEnd } = monthRange();
  const { start: todayStart, end: todayEnd } = todayRange();

  const [
    revenue,
    todayAppointments,
    missedCount,
    pendingBudgets,
    scheduleToday,
  ] = await Promise.all([
    permissions.readFinance
      ? sumAppointmentPayments(clinicId, monthStart.toISOString(), monthEnd.toISOString())
      : Promise.resolve(0),
    countAppointments(clinicId, todayStart.toISOString(), todayEnd.toISOString()),
    countAppointments(
      clinicId,
      monthStart.toISOString(),
      monthEnd.toISOString(),
      "missed"
    ),
    countBudgetsByStatus(clinicId, "pending"),
    listAppointments(clinicId, todayStart.toISOString(), todayEnd.toISOString()),
  ]);

  const filteredSchedule = role === "dentist"
    ? scheduleToday.filter((item) => item.dentist_id === userId)
    : scheduleToday;

  const patientIds = Array.from(
    new Set(filteredSchedule.map((item) => item.patient_id))
  );
  const patients = await listPatientsByIds(clinicId, patientIds);
  const patientMap = new Map(patients.map((patient) => [patient.id, patient.full_name]));
  const enrichedSchedule = filteredSchedule.map((item) => ({
    ...item,
    patient_name: patientMap.get(item.patient_id) ?? "Paciente",
  }));

  return {
    role,
    metrics: {
      revenue,
      todayAppointments,
      missedCount,
      pendingBudgets,
    },
    scheduleToday: enrichedSchedule,
  };
}
