import { appointmentSchema, AppointmentInput } from "@/types/schemas";
import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import {
  createAppointment,
  deleteAppointment,
  getAppointmentById,
  hasConflictingAppointment,
  listAppointments,
  updateAppointmentDateTime,
  updateAppointmentStatus,
} from "@/server/repositories/appointments";
import { auditLog } from "@/server/audit/auditLog";
import { z } from "zod";

export async function getAppointments(start?: string, end?: string) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "readSchedule");
  const data = await listAppointments(clinicId, start, end);
  await auditLog({
    clinicId,
    userId,
    action: "appointments.list",
    entity: "appointment",
    metadata: { start, end },
  });
  return data;
}

export async function addAppointment(input: AppointmentInput) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writeSchedule");
  const parsed = appointmentSchema.parse(input);
  const conflict = await hasConflictingAppointment(
    clinicId,
    parsed.dentist_id,
    parsed.starts_at,
    parsed.ends_at
  );
  if (conflict) {
    throw new Error("Conflito de horário");
  }
  const result = await createAppointment(clinicId, parsed);
  await auditLog({
    clinicId,
    userId,
    action: "appointments.create",
    entity: "appointment",
    entityId: result.id,
  });
  return result;
}

export async function removeAppointment(appointmentId: string) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writeSchedule");
  await deleteAppointment(clinicId, appointmentId);
  await auditLog({
    clinicId,
    userId,
    action: "appointments.delete",
    entity: "appointment",
    entityId: appointmentId,
  });
}

export async function updateAppointmentStatusItem(input: {
  appointmentId: string;
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
  paid_at?: string | null;
}) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writeSchedule");
  await updateAppointmentStatus(clinicId, input.appointmentId, {
    status: input.status,
    payment_status: input.payment_status ?? null,
    payment_method: input.payment_method ?? null,
    paid_at: input.paid_at ?? null,
  });
  await auditLog({
    clinicId,
    userId,
    action: "appointments.update",
    entity: "appointment",
    entityId: input.appointmentId,
    metadata: {
      status: input.status,
      payment_status: input.payment_status ?? null,
      payment_method: input.payment_method ?? null,
    },
  });
}

const rescheduleSchema = z.object({
  appointmentId: z.string().uuid(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
});

export async function rescheduleAppointmentItem(input: {
  appointmentId: string;
  starts_at: string;
  ends_at: string;
}) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writeSchedule");

  const parsed = rescheduleSchema.parse(input);
  const appointment = await getAppointmentById(clinicId, parsed.appointmentId);
  if (!appointment) {
    throw new Error("Agendamento nao encontrado");
  }

  const startsAt = new Date(parsed.starts_at);
  const endsAt = new Date(parsed.ends_at);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    throw new Error("Periodo de reagendamento invalido");
  }

  const conflict = await hasConflictingAppointment(
    clinicId,
    appointment.dentist_id,
    parsed.starts_at,
    parsed.ends_at,
    parsed.appointmentId
  );
  if (conflict) {
    throw new Error("Conflito de horario");
  }

  await updateAppointmentDateTime(clinicId, parsed.appointmentId, {
    starts_at: parsed.starts_at,
    ends_at: parsed.ends_at,
  });

  await auditLog({
    clinicId,
    userId,
    action: "appointments.reschedule",
    entity: "appointment",
    entityId: parsed.appointmentId,
    metadata: {
      starts_at: parsed.starts_at,
      ends_at: parsed.ends_at,
    },
  });
}
