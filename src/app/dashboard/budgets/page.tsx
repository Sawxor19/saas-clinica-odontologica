import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  HandCoins,
  PencilLine,
  Receipt,
  Trash2,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmForm } from "@/components/ui/confirm-form";
import {
  approveBudgetAndIssueContractAction,
  createBudgetAction,
  deleteBudgetAction,
  deleteBudgetItemAction,
  issueBudgetContractAction,
  updateBudgetStatusAction,
} from "@/app/dashboard/budgets/actions";
import { BudgetForm } from "@/app/dashboard/budgets/BudgetForm";
import { getBudgets } from "@/server/services/budgets";
import { getClinicContext } from "@/server/auth/context";
import { listPatients } from "@/server/repositories/patients";
import { listProcedures } from "@/server/repositories/procedures";

function formatStatus(status: string) {
  if (status === "approved") return "Aprovado";
  if (status === "rejected") return "Recusado";
  return "Rascunho";
}

function statusClassName(status: string) {
  if (status === "approved") return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border border-rose-200 bg-rose-50 text-rose-700";
  return "border border-amber-200 bg-amber-50 text-amber-700";
}

function formatCurrency(value: number) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

function shortBudgetCode(id: string) {
  return String(id ?? "").slice(0, 8).toUpperCase();
}

export default async function BudgetsPage() {
  const { clinicId } = await getClinicContext();
  const [budgets, patientsRaw, proceduresRaw] = await Promise.all([
    getBudgets(),
    listPatients(clinicId),
    listProcedures(clinicId),
  ]);

  const patients = [...(patientsRaw ?? [])].sort((a, b) =>
    String(a.full_name ?? "").localeCompare(String(b.full_name ?? ""), "pt-BR")
  );
  const procedures = [...proceduresRaw].sort((a, b) =>
    String(a.name ?? "").localeCompare(String(b.name ?? ""), "pt-BR")
  );
  const budgetFormResetKey = budgets[0]?.id ?? "empty-budget-form";
  const summary = budgets.reduce(
    (acc, budget) => {
      acc.total += 1;
      acc.gross += Number(budget.total ?? 0);
      if (budget.status === "approved") {
        acc.approved += 1;
      } else if (budget.status === "rejected") {
        acc.rejected += 1;
      } else {
        acc.draft += 1;
      }
      if (budget.contract_url) {
        acc.withContract += 1;
      }
      return acc;
    },
    {
      total: 0,
      approved: 0,
      rejected: 0,
      draft: 0,
      withContract: 0,
      gross: 0,
    }
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Orcamentos"
        description="Monte propostas por procedimento e emita contrato ao aprovar."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-2 inline-flex rounded-xl bg-white p-2 text-slate-700">
            <ClipboardList className="h-4 w-4" />
          </div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Orcamentos ativos</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.total}</p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.approved} aprovados, {summary.draft} em rascunho
          </p>
        </div>
        <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-4 shadow-[0_12px_40px_rgba(37,99,235,0.14)]">
          <div className="mb-2 inline-flex rounded-xl bg-white p-2 text-blue-700">
            <HandCoins className="h-4 w-4" />
          </div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Valor potencial</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">R$ {formatCurrency(summary.gross)}</p>
          <p className="mt-1 text-xs text-slate-500">Soma dos orcamentos listados</p>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-4 shadow-[0_12px_40px_rgba(5,150,105,0.14)]">
          <div className="mb-2 inline-flex rounded-xl bg-white p-2 text-emerald-700">
            <FileText className="h-4 w-4" />
          </div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Contratos emitidos</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.withContract}</p>
          <p className="mt-1 text-xs text-slate-500">{summary.rejected} marcados como recusados</p>
        </div>
      </div>

      <Card className="overflow-hidden border border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50">
          <CardTitle>Novo orcamento</CardTitle>
          <p className="text-sm text-slate-500">
            Preencha os dados, adicione itens do tratamento e salve para iniciar a proposta.
          </p>
        </CardHeader>
        <CardContent>
          <form action={createBudgetAction} className="space-y-4">
            <BudgetForm
              key={budgetFormResetKey}
              patients={patients}
              procedures={procedures}
            />
            <div className="flex justify-end">
              <Button type="submit">Salvar orcamento</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50">
          <CardTitle>Orcamentos criados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {budgets.length === 0 ? (
            <EmptyState
              title="Nenhum orcamento criado"
              description="Crie o primeiro orcamento para iniciar as propostas de tratamento."
            />
          ) : (
            budgets.map((budget) => (
              <div
                key={budget.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-400 opacity-70 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(budget.status)}`}
                    >
                      {formatStatus(budget.status)}
                    </span>
                    <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      <UserRound className="h-4 w-4 text-slate-400" />
                      <Link
                        href={`/dashboard/patients/${budget.patient_id}`}
                        className="transition-colors hover:text-primary"
                      >
                        {budget.patient_name}
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Criado em{" "}
                        {new Date(budget.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-600">
                        ORC-{shortBudgetCode(budget.id)}
                      </span>
                    </div>
                  </div>

                  <div className="min-w-[180px] rounded-2xl border border-slate-200 bg-slate-50 p-3 text-right">
                    <div className="text-xs text-slate-500">Total do orcamento</div>
                    <div className="text-lg font-semibold text-slate-900">
                      R$ {formatCurrency(budget.total)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Desconto aplicado: R$ {formatCurrency(budget.discount_amount)}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
                  <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    <Receipt className="h-3.5 w-3.5" />
                    Itens do tratamento
                  </div>
                  {budget.items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-slate-500">
                      Sem itens no orcamento.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-100/90 text-slate-500">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold uppercase tracking-[0.07em]">
                              Procedimento
                            </th>
                            <th className="px-3 py-2 text-center font-semibold uppercase tracking-[0.07em]">
                              Qtd. vendida
                            </th>
                            <th className="px-3 py-2 text-right font-semibold uppercase tracking-[0.07em]">
                              Valor unit.
                            </th>
                            <th className="px-3 py-2 text-right font-semibold uppercase tracking-[0.07em]">
                              Valor total
                            </th>
                            <th className="px-3 py-2 text-right font-semibold uppercase tracking-[0.07em]">
                              Acao
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {budget.items.map((item) => (
                            <tr key={item.id} className="bg-white transition-colors hover:bg-slate-50/80">
                              <td className="px-3 py-2 font-medium text-slate-700">{item.procedure_name}</td>
                              <td className="px-3 py-2 text-center text-slate-600">{item.quantity}</td>
                              <td className="px-3 py-2 text-right text-slate-600">
                                R$ {formatCurrency(item.unit_price)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-slate-700">
                                R$ {formatCurrency(item.quantity * item.unit_price)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <ConfirmForm
                                  action={deleteBudgetItemAction}
                                  message="Remover este item do orcamento?"
                                >
                                  <input type="hidden" name="budget_id" value={budget.id} />
                                  <input type="hidden" name="item_id" value={item.id} />
                                  <Button
                                    type="submit"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 rounded-xl border-rose-200 px-2 text-[11px] text-rose-700 hover:bg-rose-50"
                                  >
                                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                                    Remover
                                  </Button>
                                </ConfirmForm>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {budget.notes ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Observacoes:</span> {budget.notes}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2 border-t border-dashed border-slate-200 pt-4">
                  {budget.contract_url ? (
                    <a href={budget.contract_url} target="_blank" rel="noreferrer">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <FileText className="mr-1.5 h-4 w-4" />
                        Abrir contrato
                      </Button>
                    </a>
                  ) : null}

                  {budget.status !== "approved" ? (
                    <form action={approveBudgetAndIssueContractAction}>
                      <input type="hidden" name="budget_id" value={budget.id} />
                      <input type="hidden" name="patient_id" value={budget.patient_id} />
                      <Button type="submit" size="sm">
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Aprovar + emitir contrato
                      </Button>
                    </form>
                  ) : (
                    <form action={issueBudgetContractAction}>
                      <input type="hidden" name="budget_id" value={budget.id} />
                      <input type="hidden" name="patient_id" value={budget.patient_id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <FileText className="mr-1.5 h-4 w-4" />
                        Reemitir contrato
                      </Button>
                    </form>
                  )}

                  {budget.status !== "draft" ? (
                    <form action={updateBudgetStatusAction}>
                      <input type="hidden" name="budget_id" value={budget.id} />
                      <input type="hidden" name="status" value="draft" />
                      <Button type="submit" size="sm" variant="outline" className="rounded-xl">
                        <PencilLine className="mr-1.5 h-4 w-4" />
                        Voltar rascunho
                      </Button>
                    </form>
                  ) : null}

                  {budget.status !== "rejected" ? (
                    <form action={updateBudgetStatusAction}>
                      <input type="hidden" name="budget_id" value={budget.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50"
                      >
                        Marcar recusado
                      </Button>
                    </form>
                  ) : null}

                  <ConfirmForm
                    action={deleteBudgetAction}
                    message="Remover este orcamento e seus itens?"
                  >
                    <input type="hidden" name="budget_id" value={budget.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Remover
                    </Button>
                  </ConfirmForm>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
