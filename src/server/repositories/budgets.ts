import { supabaseServerClient } from "@/server/db/supabaseServer";
import { listPatientsByIds } from "@/server/repositories/patients";
import { listProceduresByIds } from "@/server/repositories/procedures";

export type BudgetStatus = "draft" | "approved" | "rejected";

export type BudgetItemInput = {
  procedure_id: string;
  quantity: number;
  unit_price: number;
};

export type BudgetRecord = {
  id: string;
  clinic_id: string;
  patient_id: string;
  status: BudgetStatus;
  discount: number;
  notes: string | null;
  created_at: string;
};

export type BudgetItemRecord = {
  id: string;
  budget_id: string;
  procedure_id: string;
  quantity: number;
  unit_price: number;
};

export type BudgetWithItems = BudgetRecord & {
  patient_name: string;
  items: Array<
    BudgetItemRecord & {
      procedure_name: string;
    }
  >;
};

function toBudgetStatus(value: unknown): BudgetStatus {
  if (value === "approved" || value === "rejected") return value;
  return "draft";
}

function toBudgetRecord(row: Record<string, unknown>): BudgetRecord {
  return {
    id: String(row.id ?? ""),
    clinic_id: String(row.clinic_id ?? ""),
    patient_id: String(row.patient_id ?? ""),
    status: toBudgetStatus(row.status),
    discount: Number(row.discount ?? 0),
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at ?? ""),
  };
}

function toBudgetItemRecord(row: Record<string, unknown>): BudgetItemRecord {
  return {
    id: String(row.id ?? ""),
    budget_id: String(row.budget_id ?? ""),
    procedure_id: String(row.procedure_id ?? ""),
    quantity: Number(row.quantity ?? 0),
    unit_price: Number(row.unit_price ?? 0),
  };
}

async function listItemsByBudgetIds(budgetIds: string[]) {
  if (budgetIds.length === 0) return [];
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("budget_items")
    .select("id, budget_id, procedure_id, quantity, unit_price")
    .in("budget_id", budgetIds);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toBudgetItemRecord(row as Record<string, unknown>));
}

export async function listBudgets(clinicId: string): Promise<BudgetWithItems[]> {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("id, clinic_id, patient_id, status, discount, notes, created_at")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const budgets = (data ?? []).map((row) => toBudgetRecord(row as Record<string, unknown>));
  if (budgets.length === 0) return [];

  const budgetIds = budgets.map((item) => item.id);
  const patientIds = Array.from(new Set(budgets.map((item) => item.patient_id)));
  const items = await listItemsByBudgetIds(budgetIds);
  const procedureIds = Array.from(new Set(items.map((item) => item.procedure_id)));

  const [patients, procedures] = await Promise.all([
    listPatientsByIds(clinicId, patientIds),
    listProceduresByIds(clinicId, procedureIds),
  ]);

  const patientMap = new Map(
    patients.map((item) => [String(item.id), String(item.full_name ?? "Paciente")])
  );
  const procedureMap = new Map(
    procedures.map((item) => [String(item.id), String(item.name ?? "Procedimento")])
  );

  const itemsByBudget = new Map<
    string,
    Array<
      BudgetItemRecord & {
        procedure_name: string;
      }
    >
  >();

  items.forEach((item) => {
    const current = itemsByBudget.get(item.budget_id) ?? [];
    current.push({
      ...item,
      procedure_name: procedureMap.get(item.procedure_id) ?? "Procedimento",
    });
    itemsByBudget.set(item.budget_id, current);
  });

  return budgets.map((budget) => ({
    ...budget,
    patient_name: patientMap.get(budget.patient_id) ?? "Paciente",
    items: itemsByBudget.get(budget.id) ?? [],
  }));
}

export async function getBudgetById(clinicId: string, budgetId: string): Promise<BudgetWithItems | null> {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("id, clinic_id, patient_id, status, discount, notes, created_at")
    .eq("clinic_id", clinicId)
    .eq("id", budgetId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const budget = toBudgetRecord(data as Record<string, unknown>);
  const items = await listItemsByBudgetIds([budget.id]);
  const [patients, procedures] = await Promise.all([
    listPatientsByIds(clinicId, [budget.patient_id]),
    listProceduresByIds(clinicId, Array.from(new Set(items.map((item) => item.procedure_id)))),
  ]);

  const patientName = patients[0]?.full_name ? String(patients[0].full_name) : "Paciente";
  const procedureMap = new Map(
    procedures.map((item) => [String(item.id), String(item.name ?? "Procedimento")])
  );

  return {
    ...budget,
    patient_name: patientName,
    items: items.map((item) => ({
      ...item,
      procedure_name: procedureMap.get(item.procedure_id) ?? "Procedimento",
    })),
  };
}

export async function createBudget(
  clinicId: string,
  input: {
    patient_id: string;
    status?: BudgetStatus;
    discount?: number;
    notes?: string | null;
  }
) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("budgets")
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      status: input.status ?? "draft",
      discount: Number(input.discount ?? 0),
      notes: input.notes ?? null,
    })
    .select("id, clinic_id, patient_id, status, discount, notes, created_at")
    .single();

  if (error) throw new Error(error.message);
  return toBudgetRecord(data as Record<string, unknown>);
}

export async function updateBudget(
  clinicId: string,
  budgetId: string,
  input: {
    patient_id?: string;
    discount?: number;
    notes?: string | null;
  }
) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("budgets")
    .update({
      patient_id: input.patient_id,
      discount: input.discount,
      notes: input.notes,
    })
    .eq("clinic_id", clinicId)
    .eq("id", budgetId);

  if (error) throw new Error(error.message);
}

export async function updateBudgetStatus(clinicId: string, budgetId: string, status: BudgetStatus) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("budgets")
    .update({ status })
    .eq("clinic_id", clinicId)
    .eq("id", budgetId);

  if (error) throw new Error(error.message);
}

export async function deleteBudget(clinicId: string, budgetId: string) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("id", budgetId);

  if (error) throw new Error(error.message);
}

export async function deleteBudgetItem(clinicId: string, budgetId: string, itemId: string) {
  const supabase = await supabaseServerClient();
  const { data: budget, error: budgetError } = await supabase
    .from("budgets")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("id", budgetId)
    .maybeSingle();

  if (budgetError) throw new Error(budgetError.message);
  if (!budget) throw new Error("Orcamento nao encontrado.");

  const { error } = await supabase
    .from("budget_items")
    .delete()
    .eq("budget_id", budgetId)
    .eq("id", itemId);

  if (error) throw new Error(error.message);
}

export async function replaceBudgetItems(
  clinicId: string,
  budgetId: string,
  items: BudgetItemInput[]
) {
  const supabase = await supabaseServerClient();
  const { data: budget, error: budgetError } = await supabase
    .from("budgets")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("id", budgetId)
    .maybeSingle();

  if (budgetError) throw new Error(budgetError.message);
  if (!budget) throw new Error("Orcamento nao encontrado.");

  const { error: deleteError } = await supabase
    .from("budget_items")
    .delete()
    .eq("budget_id", budgetId);
  if (deleteError) throw new Error(deleteError.message);

  if (items.length === 0) return;

  const payload = items.map((item) => ({
    budget_id: budgetId,
    procedure_id: item.procedure_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
  }));

  const { error: insertError } = await supabase
    .from("budget_items")
    .insert(payload);
  if (insertError) throw new Error(insertError.message);
}
