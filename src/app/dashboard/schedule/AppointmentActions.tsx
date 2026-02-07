"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateAppointmentStatusAction, deleteAppointmentAction } from "@/app/dashboard/schedule/actions";

const paymentOptions = [
  { value: "debit", label: "Débito" },
  { value: "credit", label: "Crédito" },
  { value: "pix", label: "Pix" },
  { value: "cash", label: "Dinheiro" },
  { value: "transfer", label: "Transferência (TED/DOC)" },
  { value: "boleto", label: "Boleto" },
];

export function AppointmentActions({
  appointmentId,
  paymentMethod,
}: {
  appointmentId: string;
  paymentMethod?: string | null;
}) {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={updateAppointmentStatusAction}>
        <input type="hidden" name="appointment_id" value={appointmentId} />
        <input type="hidden" name="status" value="confirmed" />
        <Button type="submit" size="sm" variant="outline">
          Confirmar
        </Button>
      </form>
      <form action={updateAppointmentStatusAction}>
        <input type="hidden" name="appointment_id" value={appointmentId} />
        <input type="hidden" name="status" value="arrived" />
        <Button type="submit" size="sm" variant="outline">
          Chegou
        </Button>
      </form>
      <form action={updateAppointmentStatusAction}>
        <input type="hidden" name="appointment_id" value={appointmentId} />
        <input type="hidden" name="status" value="in_progress" />
        <Button type="submit" size="sm" variant="outline">
          Em atendimento
        </Button>
      </form>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setShowPayment((prev) => !prev)}
      >
        Finalizar
      </Button>

      {showPayment ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2">
          <form action={updateAppointmentStatusAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="appointment_id" value={appointmentId} />
            <input type="hidden" name="status" value="completed" />
            <input type="hidden" name="payment_status" value="paid" />
            <select
              name="payment_method"
              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              defaultValue={paymentMethod ?? ""}
              required
            >
              <option value="">Forma de pagamento</option>
              {paymentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm">
              Confirmar pagamento
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowPayment(false)}
            >
              Cancelar
            </Button>
          </form>
        </div>
      ) : null}

      <form action={updateAppointmentStatusAction}>
        <input type="hidden" name="appointment_id" value={appointmentId} />
        <input type="hidden" name="status" value="missed" />
        <Button type="submit" size="sm" variant="outline">
          Faltou
        </Button>
      </form>
      <form action={updateAppointmentStatusAction}>
        <input type="hidden" name="appointment_id" value={appointmentId} />
        <input type="hidden" name="status" value="cancelled" />
        <Button type="submit" size="sm" variant="outline">
          Cancelar
        </Button>
      </form>
      <form
        action={deleteAppointmentAction}
        onSubmit={(event) => {
          if (!window.confirm("Remover este agendamento?")) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="appointment_id" value={appointmentId} />
        <Button type="submit" size="sm" variant="destructive">
          Remover
        </Button>
      </form>
    </div>
  );
}
