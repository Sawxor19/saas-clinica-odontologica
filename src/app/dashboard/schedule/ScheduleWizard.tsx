"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAppointmentAction } from "@/app/dashboard/schedule/actions";

type PatientOption = { id: string; full_name: string };
type DentistOption = { user_id: string; full_name: string };
type ProcedureOption = { id: string; name: string; price: number };
type RoomOption = { id: string; name: string };

export function ScheduleWizard({
  patients,
  dentists,
  procedures,
  rooms,
}: {
  patients: PatientOption[];
  dentists: DentistOption[];
  procedures: ProcedureOption[];
  rooms: RoomOption[];
}) {
  const [step, setStep] = useState(1);
  const [open, setOpen] = useState(false);
  const [selectedProcedureId, setSelectedProcedureId] = useState("");
  const [chargeAmount, setChargeAmount] = useState<string>("");

  const durationMap = useMemo(
    () => new Map(procedures.map((p) => [p.id, 30])),
    [procedures]
  );
  const procedurePriceMap = useMemo(
    () => new Map(procedures.map((p) => [p.id, p.price])),
    [procedures]
  );

  const onClose = () => {
    setOpen(false);
    setStep(1);
    setSelectedProcedureId("");
    setChargeAmount("");
  };

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="glass-panel fade-up w-full max-w-lg rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Novo agendamento</h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Fechar
              </Button>
            </div>

            <form action={createAppointmentAction} className="mt-4 space-y-4">
              {step === 1 ? (
                <div className="space-y-4">
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Paciente</label>
                  <select
                    name="patient_id"
                    className="h-12 w-full rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                    required
                  >
                    <option value="">Selecione</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Procedimento</label>
                  <select
                    name="procedure_id"
                    className="h-12 w-full rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                    required
                    value={selectedProcedureId}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSelectedProcedureId(value);
                      const price = procedurePriceMap.get(value);
                      if (price !== undefined) {
                        setChargeAmount(String(price));
                      }
                    }}
                  >
                    <option value="">Selecione</option>
                    {procedures.map((procedure) => (
                      <option key={procedure.id} value={procedure.id}>
                        {procedure.name}
                      </option>
                    ))}
                  </select>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Valor da consulta</label>
                  <Input
                    name="charge_amount"
                    type="number"
                    min="0"
                    value={chargeAmount}
                    onChange={(event) => setChargeAmount(event.target.value)}
                    required
                  />
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dentista</label>
                  <select
                    name="dentist_id"
                    className="h-12 w-full rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                    required
                  >
                    <option value="">Selecione</option>
                    {dentists.map((dentist) => (
                      <option key={dentist.user_id} value={dentist.user_id}>
                        {dentist.full_name}
                      </option>
                    ))}
                  </select>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sala</label>
                  <select
                    name="room_id"
                    className="h-12 w-full rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                  >
                    <option value="">Não definido</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Data e hora</label>
                  <Input type="datetime-local" name="starts_at" required />
                  <Input type="datetime-local" name="ends_at" required />
                  <input type="hidden" name="status" value="scheduled" />
                  <Input name="notes" placeholder="Notas rápidas" />
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                  disabled={step === 1}
                >
                  Voltar
                </Button>
                {step < 3 ? (
                  <Button type="button" onClick={() => setStep((prev) => prev + 1)}>
                    Próximo
                  </Button>
                ) : (
                  <Button type="submit">Agendar</Button>
                )}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
