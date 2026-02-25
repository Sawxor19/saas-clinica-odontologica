import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { auditLog } from "@/server/audit/auditLog";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { createAttachment } from "@/server/repositories/attachments";
import { getClinicById } from "@/server/repositories/clinics";
import { listPatientsByIds } from "@/server/repositories/patients";
import { listProceduresByIds } from "@/server/repositories/procedures";
import {
  BudgetItemInput,
  BudgetStatus,
  createBudget,
  deleteBudget,
  deleteBudgetItem,
  getBudgetById,
  listBudgets,
  replaceBudgetItems,
  updateBudgetStatus,
} from "@/server/repositories/budgets";

const STORAGE_BUCKET = "clinic-attachments";

type BudgetTotals = {
  subtotal: number;
  discount_amount: number;
  total: number;
};

type ContractAttachment = {
  file_path: string;
  file_name: string;
  created_at: string;
};

function safeStatus(value: string): BudgetStatus {
  if (value === "approved" || value === "rejected" || value === "draft") return value;
  return "draft";
}

function formatCurrency(value: number) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

function normalizeItems(
  items: BudgetItemInput[],
  allowedProcedures: Map<string, number>
) {
  return items
    .filter((item) => allowedProcedures.has(item.procedure_id))
    .map((item) => {
      const quantity = Math.max(1, Math.floor(Number(item.quantity || 0)));
      const unitPriceRaw = Number(item.unit_price ?? 0);
      const fallback = allowedProcedures.get(item.procedure_id) ?? 0;
      const unit_price = Number.isFinite(unitPriceRaw) && unitPriceRaw > 0 ? unitPriceRaw : fallback;
      return {
        procedure_id: item.procedure_id,
        quantity,
        unit_price: Math.max(0, Number(unit_price)),
      };
    })
    .filter((item) => item.procedure_id && item.quantity > 0);
}

function calculateTotals(items: Array<{ quantity: number; unit_price: number }>, discount: number): BudgetTotals {
  const subtotal = items.reduce((sum, item) => {
    return sum + Number(item.quantity || 0) * Number(item.unit_price || 0);
  }, 0);

  const discountPercent = Math.min(100, Math.max(0, Number(discount || 0)));
  const discount_amount = subtotal * (discountPercent / 100);
  const total = Math.max(0, subtotal - discount_amount);

  return {
    subtotal,
    discount_amount,
    total,
  };
}

function withTotals<T extends { items: Array<{ quantity: number; unit_price: number }>; discount: number }>(
  budget: T
): T & BudgetTotals {
  return {
    ...budget,
    ...calculateTotals(budget.items, budget.discount),
  };
}

function buildBudgetContractPrefix(budgetId: string) {
  return `contrato-orcamento-${budgetId.slice(0, 8)}-`;
}

async function listLatestContractsByBudget(
  clinicId: string,
  budgets: Array<{ id: string; patient_id: string }>
) {
  if (budgets.length === 0) {
    return new Map<string, ContractAttachment>();
  }

  const patientIds = Array.from(new Set(budgets.map((item) => item.patient_id)));
  const budgetMatchersByPatient = new Map<string, Array<{ budgetId: string; prefix: string }>>();
  budgets.forEach((budget) => {
    const current = budgetMatchersByPatient.get(budget.patient_id) ?? [];
    current.push({
      budgetId: budget.id,
      prefix: buildBudgetContractPrefix(budget.id),
    });
    budgetMatchersByPatient.set(budget.patient_id, current);
  });

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("attachments")
    .select("patient_id, file_path, file_name, created_at")
    .eq("clinic_id", clinicId)
    .eq("category", "contract")
    .in("patient_id", patientIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Falha ao buscar contratos emitidos: ${error.message}`);
  }

  const latestByBudget = new Map<string, ContractAttachment>();
  (data ?? []).forEach((row) => {
    const patientId = String(row.patient_id ?? "");
    const filePath = String(row.file_path ?? "");
    const fileName = String(row.file_name ?? "");
    const createdAt = String(row.created_at ?? "");
    if (!patientId || !filePath || !fileName || !createdAt) {
      return;
    }

    const matchers = budgetMatchersByPatient.get(patientId);
    if (!matchers || matchers.length === 0) {
      return;
    }

    matchers.forEach((matcher) => {
      if (latestByBudget.has(matcher.budgetId)) {
        return;
      }
      if (!fileName.startsWith(matcher.prefix)) {
        return;
      }
      latestByBudget.set(matcher.budgetId, {
        file_path: filePath,
        file_name: fileName,
        created_at: createdAt,
      });
    });
  });

  return latestByBudget;
}

async function buildContractUrlsByPath(paths: string[]) {
  if (paths.length === 0) return new Map<string, string | null>();

  const admin = supabaseAdmin();
  const entries = await Promise.all(
    paths.map(async (path) => {
      const { data, error } = await admin.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60 * 15);
      if (error) return [path, null] as const;
      return [path, data?.signedUrl ?? null] as const;
    })
  );

  return new Map(entries);
}

async function buildBudgetContractPdf(input: {
  clinicName: string;
  patientName: string;
  budgetId: string;
  notes: string | null;
  items: Array<{ procedure_name: string; quantity: number; unit_price: number }>;
  discount: number;
}) {
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const totals = calculateTotals(input.items, input.discount);
  const issueDate = new Date().toLocaleString("pt-BR");

  doc.fontSize(16).text("Contrato de tratamento odontologico");
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Clinica: ${input.clinicName}`);
  doc.fontSize(10).text(`Paciente: ${input.patientName}`);
  doc.fontSize(10).text(`Orcamento: ${input.budgetId}`);
  doc.fontSize(10).text(`Data de emissao: ${issueDate}`);

  doc.moveDown();
  doc.fontSize(12).text("Itens do tratamento");
  doc.moveDown(0.5);

  if (input.items.length === 0) {
    doc.fontSize(10).text("Sem itens no orcamento.");
  } else {
    input.items.forEach((item, index) => {
      const lineTotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
      doc
        .fontSize(10)
        .text(
          `${index + 1}. ${item.procedure_name} | Qtd: ${item.quantity} | Unit: R$ ${formatCurrency(item.unit_price)} | Total: R$ ${formatCurrency(lineTotal)}`
        );
    });
  }

  doc.moveDown();
  doc.fontSize(10).text(`Subtotal: R$ ${formatCurrency(totals.subtotal)}`);
  doc.fontSize(10).text(`Desconto: ${Number(input.discount || 0).toFixed(2)}%`);
  doc.fontSize(10).text(`Total final: R$ ${formatCurrency(totals.total)}`);

  if (input.notes) {
    doc.moveDown();
    doc.fontSize(12).text("Observacoes");
    doc.fontSize(10).text(input.notes);
  }

  doc.moveDown(2);
  doc.fontSize(10).text("Ao assinar, as partes concordam com o plano de tratamento descrito acima.");
  doc.moveDown(3);
  doc.fontSize(10).text("Assinatura do paciente: ________________________________");
  doc.moveDown(2);
  doc.fontSize(10).text("Assinatura da clinica: _________________________________");

  doc.end();
  await new Promise<void>((resolve) => doc.on("end", () => resolve()));
  return Buffer.concat(chunks);
}

async function storeContractAttachment(input: {
  clinicId: string;
  patientId: string;
  budgetId: string;
  pdf: Buffer;
}) {
  const fileName = `contrato-orcamento-${input.budgetId.slice(0, 8)}-${Date.now()}.pdf`;
  const filePath = `${input.clinicId}/${input.patientId}/${Date.now()}-${fileName}`;
  const admin = supabaseAdmin();
  const { error } = await admin.storage.from(STORAGE_BUCKET).upload(filePath, input.pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) {
    throw new Error(`Falha ao salvar contrato no storage: ${error.message}`);
  }

  await createAttachment(input.clinicId, {
    patient_id: input.patientId,
    file_path: filePath,
    file_name: fileName,
    category: "contract",
  });

  return {
    file_name: fileName,
    file_path: filePath,
  };
}

export async function getBudgets() {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writeBudgets");

  const budgets = await listBudgets(clinicId);
  const contractsByBudget = await listLatestContractsByBudget(clinicId, budgets);
  const contractPaths = Array.from(
    new Set(
      Array.from(contractsByBudget.values()).map((item) => item.file_path)
    )
  );
  const contractUrlsByPath = await buildContractUrlsByPath(contractPaths);
  await auditLog({
    clinicId,
    userId,
    action: "budgets.list",
    entity: "budget",
  });

  return budgets.map((budget) => {
    const contract = contractsByBudget.get(budget.id);
    return {
      ...withTotals(budget),
      contract_file_path: contract?.file_path ?? null,
      contract_file_name: contract?.file_name ?? null,
      contract_created_at: contract?.created_at ?? null,
      contract_url: contract ? (contractUrlsByPath.get(contract.file_path) ?? null) : null,
    };
  });
}

export async function addBudget(input: {
  patient_id: string;
  discount?: number;
  notes?: string | null;
  items: BudgetItemInput[];
}) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writeBudgets");

  const patient = await listPatientsByIds(clinicId, [input.patient_id]);
  if (patient.length === 0) {
    throw new Error("Paciente invalido.");
  }

  const requestedProcedureIds = Array.from(
    new Set((input.items ?? []).map((item) => item.procedure_id).filter(Boolean))
  );
  const procedures = await listProceduresByIds(clinicId, requestedProcedureIds);
  const procedureMap = new Map(
    procedures.map((item) => [String(item.id), Number(item.price ?? 0)])
  );

  const items = normalizeItems(input.items ?? [], procedureMap);
  if (items.length === 0) {
    throw new Error("Adicione ao menos 1 item valido no orcamento.");
  }

  const discount = Math.min(100, Math.max(0, Number(input.discount ?? 0)));

  const budget = await createBudget(clinicId, {
    patient_id: input.patient_id,
    status: "draft",
    discount,
    notes: input.notes?.trim() || null,
  });
  await replaceBudgetItems(clinicId, budget.id, items);

  await auditLog({
    clinicId,
    userId,
    action: "budgets.create",
    entity: "budget",
    entityId: budget.id,
    metadata: { itemCount: items.length },
  });

  return budget;
}

export async function setBudgetStatus(budgetId: string, status: string) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writeBudgets");
  const normalized = safeStatus(status);
  await updateBudgetStatus(clinicId, budgetId, normalized);

  await auditLog({
    clinicId,
    userId,
    action: "budgets.status",
    entity: "budget",
    entityId: budgetId,
    metadata: { status: normalized },
  });
}

export async function removeBudget(budgetId: string) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writeBudgets");
  await deleteBudget(clinicId, budgetId);
  await auditLog({
    clinicId,
    userId,
    action: "budgets.delete",
    entity: "budget",
    entityId: budgetId,
  });
}

export async function removeBudgetItem(budgetId: string, itemId: string) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writeBudgets");
  await deleteBudgetItem(clinicId, budgetId, itemId);
  await auditLog({
    clinicId,
    userId,
    action: "budgets.item.delete",
    entity: "budget_item",
    entityId: itemId,
    metadata: { budgetId },
  });
}

export async function issueBudgetContract(budgetId: string) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writeBudgets");

  const budget = await getBudgetById(clinicId, budgetId);
  if (!budget) {
    throw new Error("Orcamento nao encontrado.");
  }
  if (budget.items.length === 0) {
    throw new Error("Orcamento sem itens.");
  }

  const clinic = await getClinicById(clinicId);
  const pdf = await buildBudgetContractPdf({
    clinicName: clinic.name ?? "Clinica",
    patientName: budget.patient_name,
    budgetId: budget.id,
    notes: budget.notes,
    items: budget.items,
    discount: budget.discount,
  });

  const attachment = await storeContractAttachment({
    clinicId,
    patientId: budget.patient_id,
    budgetId: budget.id,
    pdf,
  });

  await auditLog({
    clinicId,
    userId,
    action: "budgets.contract",
    entity: "budget",
    entityId: budget.id,
    metadata: { fileName: attachment.file_name },
  });

  return attachment;
}

export async function approveBudgetAndIssueContract(budgetId: string) {
  await setBudgetStatus(budgetId, "approved");
  return issueBudgetContract(budgetId);
}
