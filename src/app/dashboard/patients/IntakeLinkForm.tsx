"use client";

import { useState, useTransition } from "react";
import { sendIntakeLinkAction } from "@/app/dashboard/patients/send-intake-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export function IntakeLinkForm() {
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState("");
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null
  );

  return (
    <>
      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            try {
              await sendIntakeLinkAction(formData);
              setToast({ message: "Link enviado com sucesso", variant: "success" });
              event.currentTarget.reset();
              setPhone("");
            } catch {
              setToast({ message: "Falha ao enviar link", variant: "error" });
            }
          });
        }}
      >
        <Input
          name="phone"
          placeholder="WhatsApp do paciente (com DDD)"
          required
          value={phone}
          onChange={(event) => setPhone(maskPhone(event.target.value))}
        />
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Enviando..." : "Enviar link de cadastro"}
          </Button>
        </div>
      </form>
    </>
  );
}
