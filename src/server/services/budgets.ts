import PDFDocument from "pdfkit";
import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { auditLog } from "@/server/audit/auditLog";
import { SupabaseStorageProvider } from "@/server/storage/supabase";
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

const storage = new SupabaseStorageProvider();

type BudgetTotals = {
  subtotal: number;
  discount_amount: number;
  total: number;
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
  const file = new File([new Uint8Array(input.pdf)], fileName, { type: "application/pdf" });
  const upload = await storage.upload(file, filePath);

  await createAttachment(input.clinicId, {
    patient_id: input.patientId,
    file_path: upload.path,
    file_name: fileName,
    category: "contract",
  });

  return {
    file_name: fileName,
    file_path: upload.path,
  };
}

export async function getBudgets() {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writeBudgets");

  const budgets = await listBudgets(clinicId);
  await auditLog({
    clinicId,
    userId,
    action: "budgets.list",
    entity: "budget",
  });

  return budgets.map((budget) => withTotals(budget));
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
