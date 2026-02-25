"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  createAppointmentAction,
  deleteAppointmentAction,
  rescheduleAppointmentAction,
  updateAppointmentStatusAction,
} from "@/app/dashboard/schedule/actions";
import {
  buildDateTimeLocal,
  formatTimeInZone,
  getZonedHour,
  getLocalDateKey,
  getLocalDateParts,
  getZonedDateKey,
} from "@/lib/timezone";

type Appointment = {
  id: string;
  patient_id: string;
  procedure_id: string;
  charge_amount?: number | null;
  starts_at: string;
  ends_at: string;
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
  paid_at?: string | null;
};

type Props = {
  date: Date;
  appointments: Appointment[];
  patientOptions: Array<{ id: string; full_name: string; phone?: string | null }>;
  procedureOptions: Array<{ id: string; name: string; price: number }>;
  dentistOptions: Array<{ user_id: string; full_name: string }>;
  roomOptions: Array<{ id: string; name: string }>;
  timeZone: string;
};

const HOURS = Array.from({ length: 12 }).map((_, idx) => 8 + idx);

function buildQuickRescheduleOptions(appointment: Appointment) {
  const startMs = new Date(appointment.starts_at).getTime();
  const endMs = new Date(appointment.ends_at).getTime();
  const durationMs =
    Number.isFinite(endMs - startMs) && endMs > startMs ? endMs - startMs : 60 * 60 * 1000;

  const option = (label: string, deltaMinutes: number) => {
    const startsAt = new Date(startMs + deltaMinutes * 60 * 1000).toISOString();
    const endsAt = new Date(new Date(startsAt).getTime() + durationMs).toISOString();
    return { label, startsAt, endsAt };
  };

  return [option("+30 min", 30), option("+1 hora", 60), option("+1 dia", 24 * 60)];
}

export function ScheduleDayView({
  date,
  appointments,
  patientOptions,
  procedureOptions,
  dentistOptions,
  roomOptions,
  timeZone,
}: Props) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");

  const patientMap = useMemo(() => {
    return new Map(patientOptions.map((patient) => [patient.id, patient]));
  }, [patientOptions]);

  const procedureMap = useMemo(() => {
    return new Map(procedureOptions.map((procedure) => [procedure.id, procedure]));
  }, [procedureOptions]);

  const selectedDateKey = useMemo(() => getLocalDateKey(date), [date]);
  const dayAppointments = useMemo(() => {
    return appointments.filter((item) => {
      const itemDate = new Date(item.starts_at);
      return getZonedDateKey(itemDate, timeZone) === selectedDateKey;
    });
  }, [appointments, selectedDateKey, timeZone]);

  const selectedAppointment = useMemo(() => {
    if (!selectedAppointmentId) return null;
    return dayAppointments.find((item) => item.id === selectedAppointmentId) ?? null;
  }, [dayAppointments, selectedAppointmentId]);

  const quickRescheduleOptions = useMemo(() => {
    if (!selectedAppointment) return [];
    return buildQuickRescheduleOptions(selectedAppointment);
  }, [selectedAppointment]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        {HOURS.map((hour) => {
          const slotAppointments = dayAppointments.filter((item) => {
            const itemDate = new Date(item.starts_at);
            return getZonedHour(itemDate, timeZone) === hour;
          });

          const slotAppointment = slotAppointments[0];
          const isSelectedHour = selectedHour === hour;
          const isSelectedAppointment =
            selectedAppointmentId && slotAppointment?.id === selectedAppointmentId;

          return (
            <div
              key={hour}
              className="flex items-start gap-4 rounded-lg border bg-card p-3"
            >
              <div className="w-16 text-xs text-muted-foreground">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div className="flex-1 space-y-2">
                {slotAppointments.length === 0 ? (
                  <button
                    className="text-xs text-primary"
                    onClick={() => {
                      setSelectedHour(hour);
                      setSelectedAppointmentId(null);
                    }}
                  >
                    + Agendar neste horario
                  </button>
                ) : (
                  <div className="flex items-center justify-between rounded-md border px-2 py-1">
                    <button
                      type="button"
                      className="flex flex-1 items-center justify-between gap-2 text-left"
                      onClick={() => {
                        if (slotAppointment) {
                          setSelectedAppointmentId(slotAppointment.id);
                          setSelectedHour(null);
                          setPaymentMethod(slotAppointment.payment_method ?? "");
                        }
                      }}
                    >
                      <span className="text-xs">
                        {slotAppointment
                          ? formatTimeInZone(new Date(slotAppointment.starts_at), timeZone)
                          : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {slotAppointment
                          ? patientMap.get(slotAppointment.patient_id)?.full_name ?? "Paciente"
                          : ""}
                      </span>
                      {slotAppointment ? <StatusBadge status={slotAppointment.status} /> : null}
                    </button>
                  </div>
                )}

                {isSelectedHour ? (
                  <div className="rounded-lg border bg-background p-3">
                    <h3 className="text-xs font-medium">Agendar {String(hour).padStart(2, "0")}:00</h3>
                    <form
                      className="mt-3 grid gap-2 md:grid-cols-2"
                      action={createAppointmentAction}
                    >
                      <input type="hidden" name="status" value="scheduled" />
                      <input
                        type="hidden"
                        name="starts_at"
                        value={buildDateTimeLocal(getLocalDateParts(date), hour, 0)}
                      />
                      <input
                        type="hidden"
                        name="ends_at"
                        value={buildDateTimeLocal(getLocalDateParts(date), hour + 1, 0)}
                      />
                      <select
                        name="procedure_id"
                        className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                        required
                      >
                        <option value="">Procedimento</option>
                        {procedureOptions.map((procedure) => (
                          <option key={procedure.id} value={procedure.id}>
                            {procedure.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                        name="charge_amount"
                        type="number"
                        min="0"
                        placeholder="Valor"
                        required
                      />
                      <select
                        name="patient_id"
                        className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                        required
                      >
                        <option value="">Paciente</option>
                        {patientOptions.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.full_name}
                          </option>
                        ))}
                      </select>
                      <select
                        name="dentist_id"
                        className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                        required
                      >
                        <option value="">Dentista</option>
                        {dentistOptions.map((dentist) => (
                          <option key={dentist.user_id} value={dentist.user_id}>
                            {dentist.full_name}
                          </option>
                        ))}
                      </select>
                      <select
                        name="room_id"
                        className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                      >
                        <option value="">Sala</option>
                        {roomOptions.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name}
                          </option>
                        ))}
                      </select>
                      <div className="md:col-span-2 flex items-center justify-between">
                        <Button type="submit">Agendar</Button>
                        <Button type="button" variant="ghost" onClick={() => setSelectedHour(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : null}

                {isSelectedAppointment && selectedAppointment ? (
                  <div className="rounded-lg border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-medium">Detalhes do agendamento</h3>
                        <p className="text-[11px] text-muted-foreground">
                          {formatTimeInZone(new Date(selectedAppointment.starts_at), timeZone)}
                          {" "}-{" "}
                          {formatTimeInZone(new Date(selectedAppointment.ends_at), timeZone)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAppointmentId(null)}
                      >
                        Fechar
                      </Button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Paciente:</span>
                      <Link
                        className="text-primary"
                        href={`/dashboard/patients/${selectedAppointment.patient_id}`}
                      >
                        {patientMap.get(selectedAppointment.patient_id)?.full_name ?? "Paciente"}
                      </Link>
                      <span className="text-muted-foreground">Procedimento:</span>
                      <span>
                        {procedureMap.get(selectedAppointment.procedure_id)?.name ?? "Procedimento"}
                      </span>
                      <span className="text-muted-foreground">Valor:</span>
                      <span>R$ {Number(selectedAppointment.charge_amount ?? 0).toFixed(2)}</span>
                      <StatusBadge status={selectedAppointment.status} />
                      {selectedAppointment.payment_status === "paid" ? (
                        <span className="text-[11px] text-emerald-600">Pago</span>
                      ) : null}
                    </div>

                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "Confirmar", value: "confirmed", className: "text-emerald-600" },
                          { label: "Chegou", value: "in_progress", className: "text-sky-600" },
                          { label: "Finalizar", value: "completed", className: "text-emerald-700" },
                          { label: "Faltou", value: "missed", className: "text-amber-600" },
                          { label: "Cancelar", value: "cancelled", className: "text-rose-600" },
                        ].map((item) => (
                          <form key={item.value} action={updateAppointmentStatusAction}>
                            <input type="hidden" name="appointment_id" value={selectedAppointment.id} />
                            <input type="hidden" name="status" value={item.value} />
                            <button className={`text-xs ${item.className}`}>{item.label}</button>
                          </form>
                        ))}
                        <form action={deleteAppointmentAction}>
                          <input type="hidden" name="appointment_id" value={selectedAppointment.id} />
                          <button className="text-xs text-destructive">Remover agendamento</button>
                        </form>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="h-10 rounded-2xl border border-input bg-white px-4 text-xs text-foreground"
                          value={paymentMethod}
                          onChange={(event) => setPaymentMethod(event.target.value)}
                        >
                          <option value="">Forma de pagamento</option>
                          <option value="cash">Dinheiro</option>
                          <option value="card">Cartao</option>
                          <option value="pix">Pix</option>
                          <option value="transfer">Transferencia</option>
                        </select>
                        <form action={updateAppointmentStatusAction}>
                          <input type="hidden" name="appointment_id" value={selectedAppointment.id} />
                          <input type="hidden" name="status" value={selectedAppointment.status} />
                          <input type="hidden" name="payment_status" value="paid" />
                          <input type="hidden" name="payment_method" value={paymentMethod} />
                          <Button type="submit" size="sm">
                            Marcar pago
                          </Button>
                        </form>
                        <form action={updateAppointmentStatusAction}>
                          <input type="hidden" name="appointment_id" value={selectedAppointment.id} />
                          <input type="hidden" name="status" value={selectedAppointment.status} />
                          <input type="hidden" name="payment_status" value="unpaid" />
                          <Button type="submit" size="sm" variant="outline">
                            Nao pago
                          </Button>
                        </form>
                      </div>

                      <div className="rounded-lg border border-dashed border-border p-3">
                        <p className="text-xs font-medium">Reagendamento rapido</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {quickRescheduleOptions.map((option) => (
                            <form key={option.label} action={rescheduleAppointmentAction}>
                              <input type="hidden" name="appointment_id" value={selectedAppointment.id} />
                              <input type="hidden" name="starts_at" value={option.startsAt} />
                              <input type="hidden" name="ends_at" value={option.endsAt} />
                              <Button type="submit" size="sm" variant="outline">
                                {option.label}
                              </Button>
                            </form>
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Mantem a duracao original e valida conflito de horario antes de salvar.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
