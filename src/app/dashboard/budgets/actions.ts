"use server";

import { revalidatePath } from "next/cache";
import {
  addBudget,
  approveBudgetAndIssueContract,
  issueBudgetContract,
  removeBudget,
  setBudgetStatus,
} from "@/server/services/budgets";

function parseDecimalInput(value: FormDataEntryValue | null) {
  if (!value) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.,-]/g, "");
  if (!cleaned) return 0;
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = cleaned.replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePositiveInt(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
}

export async function createBudgetAction(formData: FormData) {
  const patientId = String(formData.get("patient_id") || "");
  if (!patientId) return;

  const procedureIds = formData.getAll("procedure_id").map(String);
  const quantities = formData.getAll("quantity");
  const unitPrices = formData.getAll("unit_price");

  await addBudget({
    patient_id: patientId,
    discount: parseDecimalInput(formData.get("discount")),
    notes: String(formData.get("notes") || "").trim() || null,
    items: procedureIds.map((procedureId, index) => ({
      procedure_id: procedureId,
      quantity: parsePositiveInt(quantities[index] ?? null),
      unit_price: parseDecimalInput(unitPrices[index] ?? null),
    })),
  });

  revalidatePath("/dashboard/budgets");
  revalidatePath(`/dashboard/patients/${patientId}`);
}

export async function updateBudgetStatusAction(formData: FormData) {
  const budgetId = String(formData.get("budget_id") || "");
  const status = String(formData.get("status") || "draft");
  if (!budgetId) return;

  await setBudgetStatus(budgetId, status);
  revalidatePath("/dashboard/budgets");
}

export async function approveBudgetAndIssueContractAction(formData: FormData) {
  const budgetId = String(formData.get("budget_id") || "");
  const patientId = String(formData.get("patient_id") || "");
  if (!budgetId) return;

  await approveBudgetAndIssueContract(budgetId);
  revalidatePath("/dashboard/budgets");
  if (patientId) {
    revalidatePath(`/dashboard/patients/${patientId}`);
  }
}

export async function issueBudgetContractAction(formData: FormData) {
  const budgetId = String(formData.get("budget_id") || "");
  const patientId = String(formData.get("patient_id") || "");
  if (!budgetId) return;

  await issueBudgetContract(budgetId);
  revalidatePath("/dashboard/budgets");
  if (patientId) {
    revalidatePath(`/dashboard/patients/${patientId}`);
  }
}

export async function deleteBudgetAction(formData: FormData) {
  const budgetId = String(formData.get("budget_id") || "");
  if (!budgetId) return;

  await removeBudget(budgetId);
  revalidatePath("/dashboard/budgets");
}
