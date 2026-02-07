import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { listAppointmentPayments } from "@/server/repositories/appointments";
import { listPatientsByIds } from "@/server/repositories/patients";
import { listProceduresByIds } from "@/server/repositories/procedures";

function todayRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  return { start, end };
}

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

export async function getFinanceSummary() {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "readFinance");

  const { start: todayStart, end: todayEnd } = todayRange();
  const { start: monthStart, end: monthEnd } = monthRange();

  const [todayPayments, monthPayments] = await Promise.all([
    listAppointmentPayments(clinicId, todayStart.toISOString(), todayEnd.toISOString()),
    listAppointmentPayments(clinicId, monthStart.toISOString(), monthEnd.toISOString()),
  ]);

  const todayTotal = todayPayments.reduce(
    (sum, row) => sum + Number(row.charge_amount ?? 0),
    0
  );
  const monthTotal = monthPayments.reduce(
    (sum, row) => sum + Number(row.charge_amount ?? 0),
    0
  );

  const patientIds = Array.from(new Set(monthPayments.map((row) => row.patient_id)));
  const procedureIds = Array.from(new Set(monthPayments.map((row) => row.procedure_id)));
  const [patients, procedures] = await Promise.all([
    listPatientsByIds(clinicId, patientIds),
    listProceduresByIds(clinicId, procedureIds),
  ]);
  const patientMap = new Map(patients.map((patient) => [patient.id, patient.full_name]));
  const procedureMap = new Map(procedures.map((procedure) => [procedure.id, procedure.name]));

  const enrichedPayments = monthPayments.map((row) => ({
    ...row,
    patient_name: patientMap.get(row.patient_id) ?? "Paciente",
    procedure_name: procedureMap.get(row.procedure_id) ?? "Procedimento",
  }));

  return {
    todayTotal,
    monthTotal,
    payments: enrichedPayments,
  };
}
