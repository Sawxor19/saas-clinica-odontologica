import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { listPaidAppointmentsByRange } from "@/server/repositories/appointments";
import { listProceduresByIds } from "@/server/repositories/procedures";
import { listProfilesByIds } from "@/server/repositories/profiles";
import { countBudgets, countBudgetsByStatus } from "@/server/repositories/metrics";

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

export async function getReportsSummary(startDate?: string, endDate?: string) {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "readFinance");
  const range = startDate && endDate
    ? { start: new Date(startDate), end: new Date(`${endDate}T23:59:59`) }
    : monthRange();
  const { start, end } = range;

  const paidAppointments = await listPaidAppointmentsByRange(
    clinicId,
    start.toISOString(),
    end.toISOString()
  );

  const procedureIds = Array.from(new Set(paidAppointments.map((item) => item.procedure_id)));
  const dentistIds = Array.from(new Set(paidAppointments.map((item) => item.dentist_id)));
  const [procedures, dentists] = await Promise.all([
    listProceduresByIds(clinicId, procedureIds.filter(Boolean) as string[]),
    listProfilesByIds(clinicId, dentistIds.filter(Boolean) as string[]),
  ]);

  const procedureMap = new Map(procedures.map((item) => [item.id, item.name]));
  const dentistMap = new Map(dentists.map((item) => [item.user_id, item.full_name]));

  const revenueByProcedure = new Map<string, number>();
  const revenueByDentist = new Map<string, number>();

  paidAppointments.forEach((item) => {
    const amount = Number(item.charge_amount ?? 0);
    if (item.procedure_id) {
      revenueByProcedure.set(
        item.procedure_id,
        (revenueByProcedure.get(item.procedure_id) ?? 0) + amount
      );
    }
    if (item.dentist_id) {
      revenueByDentist.set(
        item.dentist_id,
        (revenueByDentist.get(item.dentist_id) ?? 0) + amount
      );
    }
  });

  const procedureReport = Array.from(revenueByProcedure.entries()).map(([id, total]) => ({
    id,
    name: procedureMap.get(id) ?? "Procedimento",
    total,
  }));

  const dentistReport = Array.from(revenueByDentist.entries()).map(([id, total]) => ({
    id,
    name: dentistMap.get(id) ?? "Dentista",
    total,
  }));

  const totalBudgets = await countBudgets(clinicId, start.toISOString(), end.toISOString());
  const approvedBudgets = await countBudgetsByStatus(
    clinicId,
    "approved",
    start.toISOString(),
    end.toISOString()
  );
  const conversionRate = totalBudgets > 0 ? Math.round((approvedBudgets / totalBudgets) * 100) : 0;

  return {
    procedureReport: procedureReport.sort((a, b) => b.total - a.total),
    dentistReport: dentistReport.sort((a, b) => b.total - a.total),
    conversionRate,
    totalBudgets,
    approvedBudgets,
  };
}
