import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { listAppointmentPayments, listAppointments } from "@/server/repositories/appointments";
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

function isBillableStatus(status: string | null | undefined) {
  return status !== "cancelled" && status !== "missed";
}

function isUnpaid(paymentStatus: string | null | undefined) {
  return paymentStatus !== "paid";
}

function toDueDate(startsAt: string | null | undefined, endsAt: string | null | undefined) {
  return endsAt ?? startsAt ?? null;
}

function toValidId(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function getFinanceSummary() {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "readFinance");

  const now = new Date();
  const { start: todayStart, end: todayEnd } = todayRange();
  const { start: monthStart, end: monthEnd } = monthRange();

  const [todayPayments, monthPayments, monthAppointments, appointmentsUntilNow] = await Promise.all([
    listAppointmentPayments(clinicId, todayStart.toISOString(), todayEnd.toISOString()),
    listAppointmentPayments(clinicId, monthStart.toISOString(), monthEnd.toISOString()),
    listAppointments(clinicId, monthStart.toISOString(), monthEnd.toISOString()),
    listAppointments(clinicId, undefined, now.toISOString()),
  ]);

  const todayTotal = todayPayments.reduce(
    (sum, row) => sum + Number(row.charge_amount ?? 0),
    0
  );
  const monthTotal = monthPayments.reduce(
    (sum, row) => sum + Number(row.charge_amount ?? 0),
    0
  );

  const receivablesRaw = monthAppointments.filter((row) => {
    const amount = Number(row.charge_amount ?? 0);
    return amount > 0 && isBillableStatus(row.status) && isUnpaid(row.payment_status);
  });

  const overdueRaw = appointmentsUntilNow.filter((row) => {
    const amount = Number(row.charge_amount ?? 0);
    if (amount <= 0 || !isBillableStatus(row.status) || !isUnpaid(row.payment_status)) {
      return false;
    }
    const dueDate = toDueDate(row.starts_at, row.ends_at);
    return dueDate ? new Date(dueDate).getTime() < now.getTime() : false;
  });

  const monthReceivableTotal = receivablesRaw.reduce(
    (sum, row) => sum + Number(row.charge_amount ?? 0),
    0
  );
  const overdueTotal = overdueRaw.reduce(
    (sum, row) => sum + Number(row.charge_amount ?? 0),
    0
  );

  const paymentPatientIds = monthPayments.map((row) => toValidId(row.patient_id));
  const receivablePatientIds = receivablesRaw.map((row) => toValidId(row.patient_id));
  const paymentProcedureIds = monthPayments.map((row) => toValidId(row.procedure_id));
  const receivableProcedureIds = receivablesRaw.map((row) => toValidId(row.procedure_id));

  const patientIds = Array.from(
    new Set([...paymentPatientIds, ...receivablePatientIds].filter((id): id is string => Boolean(id)))
  );
  const procedureIds = Array.from(
    new Set([...paymentProcedureIds, ...receivableProcedureIds].filter((id): id is string => Boolean(id)))
  );
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

  const enrichedReceivables = receivablesRaw
    .map((row) => {
      const dueDate = toDueDate(row.starts_at, row.ends_at);
      const isOverdue = dueDate ? new Date(dueDate).getTime() < now.getTime() : false;

      return {
        ...row,
        due_date: dueDate,
        due_status: isOverdue ? "overdue" : "pending",
        patient_name: patientMap.get(row.patient_id) ?? "Paciente",
        procedure_name: procedureMap.get(row.procedure_id) ?? "Procedimento",
      };
    })
    .sort((a, b) => {
      const aTime = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

  return {
    todayTotal,
    monthReceivableTotal,
    overdueTotal,
    overdueCount: overdueRaw.length,
    monthTotal,
    payments: enrichedPayments,
    receivables: enrichedReceivables,
  };
}
