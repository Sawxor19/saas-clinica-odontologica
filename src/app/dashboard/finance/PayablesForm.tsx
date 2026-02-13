"use client";

import { useMemo, useState } from "react";
import { addPayableAction } from "@/app/dashboard/finance/actions";
import { Button } from "@/components/ui/button";

const INSTALLMENT_METHODS = new Set(["boleto", "credit_card"]);

const methodOptions = [
  { value: "", label: "Forma de pagamento" },
  { value: "boleto", label: "Boleto" },
  { value: "pix", label: "Pix" },
  { value: "transfer", label: "Transferência (TED/DOC)" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "cash", label: "Dinheiro" },
  { value: "debit", label: "Cartão de débito" },
];

export function PayablesForm() {
  const [method, setMethod] = useState("");
  const showInstallments = INSTALLMENT_METHODS.has(method);
  const installmentsOptions = useMemo(() => Array.from({ length: 48 }, (_, i) => i + 1), []);

  return (
    <form action={addPayableAction} className="grid gap-3 md:grid-cols-6">
      <input
        className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground md:col-span-2"
        name="name"
        placeholder="Nome"
        required
      />
      <input
        className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
        name="amount"
        type="number"
        min="0"
        placeholder="Valor"
        required
      />
      <input
        className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
        name="due_date"
        type="date"
        required
      />
      <select
        name="payment_method"
        className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
        value={method}
        onChange={(event) => setMethod(event.target.value)}
      >
        {methodOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        name="installments"
        className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
        disabled={!showInstallments}
        defaultValue=""
      >
        <option value="">Parcelas</option>
        {installmentsOptions.map((value) => (
          <option key={value} value={value}>
            {value}x
          </option>
        ))}
      </select>
      <select
        name="is_paid"
        className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
        defaultValue="false"
      >
        <option value="false">Não pago</option>
        <option value="true">Pago</option>
      </select>
      <div className="md:col-span-6">
        <Button type="submit">Adicionar</Button>
      </div>
    </form>
  );
}
