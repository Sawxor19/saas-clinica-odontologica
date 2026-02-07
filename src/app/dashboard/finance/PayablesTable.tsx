"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updatePayableAction, deletePayableAction } from "@/app/dashboard/finance/actions";

type PayableRow = {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  payment_method: string | null;
  installments?: number | null;
  is_paid: boolean;
};

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

export function PayablesTable({ payables }: { payables: PayableRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [methodMap, setMethodMap] = useState<Record<string, string>>({});

  return (
    <div className="space-y-3">
      {payables.map((payable) => {
        const isOpen = openId === payable.id;
        const method = methodMap[payable.id] ?? payable.payment_method ?? "";
        const showInstallments = INSTALLMENT_METHODS.has(method);
        return (
          <div key={payable.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{payable.name}</div>
                <div className="text-xs text-muted-foreground">
                  R$ {Number(payable.amount ?? 0).toFixed(2)} • Vencimento {new Date(payable.due_date).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setOpenId(isOpen ? null : payable.id)}>
                  {isOpen ? "Fechar" : "Editar"}
                </Button>
                <form action={deletePayableAction}>
                  <input type="hidden" name="payable_id" value={payable.id} />
                  <Button size="sm" variant="outline" className="text-destructive" type="submit">
                    Remover
                  </Button>
                </form>
              </div>
            </div>

            {isOpen ? (
              <form className="mt-4 grid gap-3 md:grid-cols-2" action={updatePayableAction}>
                <input type="hidden" name="payable_id" value={payable.id} />
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  name="name"
                  defaultValue={payable.name}
                  placeholder="Nome"
                />
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  name="amount"
                  type="number"
                  min="0"
                  defaultValue={payable.amount}
                  placeholder="Valor"
                />
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  name="due_date"
                  type="date"
                  defaultValue={payable.due_date}
                />
                <select
                  name="payment_method"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={method}
                  onChange={(event) =>
                    setMethodMap((prev) => ({ ...prev, [payable.id]: event.target.value }))
                  }
                >
                  {methodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  name="installments"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue={payable.installments?.toString() ?? ""}
                  disabled={!showInstallments}
                >
                  <option value="">Parcelas</option>
                  {Array.from({ length: 48 }, (_, index) => index + 1).map((value) => (
                    <option key={value} value={value}>
                      {value}x
                    </option>
                  ))}
                </select>
                <select
                  name="is_paid"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue={payable.is_paid ? "true" : "false"}
                >
                  <option value="false">Não pago</option>
                  <option value="true">Pago</option>
                </select>
                <div className="md:col-span-2">
                  <Button type="submit">Salvar alterações</Button>
                </div>
              </form>
            ) : null}
          </div>
        );
      })}
      {payables.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum pagamento a registrar.</div>
      ) : null}
    </div>
  );
}
