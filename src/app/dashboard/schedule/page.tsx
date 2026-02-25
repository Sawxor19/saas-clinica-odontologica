import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAppointments } from "@/server/services/appointments";
import { ScheduleWizard } from "@/app/dashboard/schedule/ScheduleWizard";
import { getClinicContext } from "@/server/auth/context";
import { listPatients } from "@/server/repositories/patients";
import { listProcedures } from "@/server/repositories/procedures";
import { listDentists } from "@/server/repositories/profiles";
import { listRooms } from "@/server/repositories/rooms";
import { ScheduleCalendarView } from "@/app/dashboard/schedule/ScheduleCalendarView";
import { AppointmentActions } from "@/app/dashboard/schedule/AppointmentActions";
import { getClinicTimezone } from "@/server/repositories/clinics";
import {
  addDaysToParts,
  formatTimeInZone,
  getWeekdayFromParts,
  getZonedDateKey,
  getZonedDateParts,
  normalizeTimeZone,
  zonedTimeToUtc,
} from "@/lib/timezone";

export default async function SchedulePage() {
  const { clinicId } = await getClinicContext();
  const clinicTimezone = normalizeTimeZone(await getClinicTimezone(clinicId));
  const todayParts = getZonedDateParts(new Date(), clinicTimezone);
  const start = zonedTimeToUtc({ ...todayParts, hour: 0, minute: 0, second: 0 }, clinicTimezone);
  const end = zonedTimeToUtc({ ...todayParts, hour: 23, minute: 59, second: 59 }, clinicTimezone);
  const appointments = await getAppointments(start.toISOString(), end.toISOString());
  const [patients, procedures, dentists, rooms] = await Promise.all([
    listPatients(clinicId),
    listProcedures(clinicId),
    listDentists(clinicId),
    listRooms(clinicId),
  ]);
  const patientMap = new Map(patients.map((patient) => [patient.id, patient]));

  const weekday = getWeekdayFromParts(todayParts);
  const weekStartParts = addDaysToParts(todayParts, -weekday);
  const weekEndParts = addDaysToParts(todayParts, 6 - weekday);
  const weekStart = zonedTimeToUtc(
    { ...weekStartParts, hour: 0, minute: 0, second: 0 },
    clinicTimezone
  );
  const weekEnd = zonedTimeToUtc(
    { ...weekEndParts, hour: 23, minute: 59, second: 59 },
    clinicTimezone
  );
  const weekAppointments = await getAppointments(weekStart.toISOString(), weekEnd.toISOString());

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Agenda"
        description="Visão rápida do dia com status e alertas de conflito."
      />
      <Card className="border-border/70 bg-card/97">
        <CardHeader>
          <CardTitle>Hoje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appointments.length === 0 ? (
            <EmptyState
              title="Nenhum atendimento hoje"
              description="A agenda está limpa para novas marcações."
            />
          ) : (
            appointments.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between rounded-xl border border-border/70 bg-background/92 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[0.04] hover:shadow-[0_12px_24px_rgba(37,99,235,0.12)]"
              >
                <div>
                  <p className="text-sm font-semibold">Consulta</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeInZone(new Date(item.starts_at), clinicTimezone)}
                  </p>
                  <Link
                    className="text-xs text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
                    href={`/dashboard/patients/${item.patient_id}`}
                  >
                    {patientMap.get(item.patient_id)?.full_name ?? "Paciente"}
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <AppointmentActions
                    appointmentId={item.id}
                    paymentMethod={item.payment_method}
                  />
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <ScheduleCalendarView
        initialDate={getZonedDateKey(new Date(), clinicTimezone)}
        appointments={weekAppointments}
        patientOptions={patients}
        procedureOptions={procedures}
        dentistOptions={dentists}
        roomOptions={rooms}
        timeZone={clinicTimezone}
      />
      <ScheduleWizard patients={patients} procedures={procedures} dentists={dentists} rooms={rooms} />
    </div>
  );
}
