import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { auditLog } from "@/server/audit/auditLog";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { createAttachment } from "@/server/repositories/attachments";
import { getClinicById } from "@/server/repositories/clinics";
import { listPatientsByIds } from "@/server/repositories/patients";
import { listProceduresByIds } from "@/server/repositories/procedures";
import { removeStorageFiles } from "@/server/storage/cleanup";
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
  const doc = new PDFDocument({ margin: 34, size: "A4" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const totals = calculateTotals(input.items, input.discount);
  const tz = "America/Sao_Paulo";
  const now = new Date();
  const issueDateLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  const validityDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const validityDateLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(validityDate);
  const contractCode = `ORC-${input.budgetId.slice(0, 8).toUpperCase()}`;

  const colors = {
    primary: "#0F3D66",
    primaryStrong: "#0B2E4F",
    soft: "#EEF4FB",
    border: "#D3DFEC",
    text: "#1F2937",
    muted: "#5E7186",
    white: "#FFFFFF",
    success: "#0D9488",
  };

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const contentWidth = right - left;

  const drawCard = (
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string
  ) => {
    doc.save();
    doc.fillColor(colors.soft);
    doc.roundedRect(x, y, width, height, 8).fill();
    doc.restore();
    doc.save();
    doc.strokeColor(colors.border).lineWidth(1);
    doc.roundedRect(x, y, width, height, 8).stroke();
    doc.restore();
    doc.fillColor(colors.muted).font("Helvetica-Bold").fontSize(8).text(label, x + 10, y + 8, {
      width: width - 20,
    });
    doc.fillColor(colors.text).font("Helvetica").fontSize(9.5).text(value || "-", x + 10, y + 22, {
      width: width - 20,
    });
  };

  doc.save();
  doc.fillColor(colors.primary);
  doc.rect(0, 0, doc.page.width, 76).fill();
  doc.restore();
  doc.fillColor(colors.white).font("Helvetica-Bold").fontSize(16).text(
    "CONTRATO DE TRATAMENTO ODONTOLOGICO",
    left,
    24,
    { width: contentWidth }
  );
  doc.fillColor("#D8E6F5").font("Helvetica").fontSize(9).text(
    "Documento formal do plano clinico aprovado e das condicoes comerciais.",
    left,
    47,
    { width: contentWidth }
  );

  const topInfoY = 90;
  const gap = 10;
  const cardW = (contentWidth - gap) / 2;
  const cardH = 48;
  drawCard(left, topInfoY, cardW, cardH, "CLINICA", input.clinicName || "Clinica");
  drawCard(left + cardW + gap, topInfoY, cardW, cardH, "PACIENTE", input.patientName || "Paciente");
  drawCard(left, topInfoY + cardH + 8, cardW, cardH, "CODIGO / ORCAMENTO", contractCode);
  drawCard(
    left + cardW + gap,
    topInfoY + cardH + 8,
    cardW,
    cardH,
    "EMISSAO / VALIDADE",
    `${issueDateLabel} | validade ate ${validityDateLabel}`
  );

  doc.fillColor(colors.text).font("Helvetica-Bold").fontSize(11).text("Procedimentos contratados", left, 204, {
    width: contentWidth,
  });

  const maxVisibleItems = 6;
  const visibleItems = input.items.slice(0, maxVisibleItems);
  const hiddenItems = input.items.slice(maxVisibleItems);
  const hiddenQty = hiddenItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const hiddenTotal = hiddenItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0
  );

  const rows = visibleItems.map((item) => ({
    name: item.procedure_name,
    qty: String(item.quantity),
    unit: `R$ ${formatCurrency(item.unit_price)}`,
    total: `R$ ${formatCurrency(Number(item.quantity || 0) * Number(item.unit_price || 0))}`,
  }));
  if (hiddenItems.length > 0) {
    rows.push({
      name: `Outros ${hiddenItems.length} procedimento(s) consolidados`,
      qty: String(hiddenQty),
      unit: "-",
      total: `R$ ${formatCurrency(hiddenTotal)}`,
    });
  }

  const tableX = left;
  const tableY = 222;
  const tableW = contentWidth;
  const rowH = 20;
  const headerH = 22;
  const c1 = tableW * 0.54;
  const c2 = tableW * 0.12;
  const c3 = tableW * 0.16;
  const c4 = tableW * 0.18;

  doc.save();
  doc.fillColor(colors.primaryStrong);
  doc.roundedRect(tableX, tableY, tableW, headerH, 6).fill();
  doc.restore();
  doc.fillColor(colors.white).font("Helvetica-Bold").fontSize(8.5);
  doc.text("Procedimento", tableX + 8, tableY + 7, { width: c1 - 12 });
  doc.text("Qtd", tableX + c1, tableY + 7, { width: c2, align: "center" });
  doc.text("Unitario", tableX + c1 + c2, tableY + 7, { width: c3 - 8, align: "right" });
  doc.text("Total", tableX + c1 + c2 + c3, tableY + 7, { width: c4 - 8, align: "right" });

  rows.forEach((row, index) => {
    const y = tableY + headerH + index * rowH;
    doc.save();
    doc.fillColor(index % 2 === 0 ? colors.white : colors.soft);
    doc.rect(tableX, y, tableW, rowH).fill();
    doc.restore();
    doc.save();
    doc.strokeColor(colors.border).lineWidth(0.7);
    doc.rect(tableX, y, tableW, rowH).stroke();
    doc.moveTo(tableX + c1, y).lineTo(tableX + c1, y + rowH).stroke();
    doc.moveTo(tableX + c1 + c2, y).lineTo(tableX + c1 + c2, y + rowH).stroke();
    doc.moveTo(tableX + c1 + c2 + c3, y).lineTo(tableX + c1 + c2 + c3, y + rowH).stroke();
    doc.restore();
    doc.fillColor(colors.text).font("Helvetica").fontSize(8.5).text(row.name, tableX + 8, y + 6, {
      width: c1 - 12,
    });
    doc.text(row.qty, tableX + c1, y + 6, { width: c2, align: "center" });
    doc.text(row.unit, tableX + c1 + c2 + 3, y + 6, { width: c3 - 8, align: "right" });
    doc.font("Helvetica-Bold").text(row.total, tableX + c1 + c2 + c3 + 3, y + 6, {
      width: c4 - 8,
      align: "right",
    });
    doc.font("Helvetica");
  });

  const summaryY = tableY + headerH + rows.length * rowH + 12;
  const summaryW = 258;
  const summaryH = 72;
  const summaryX = right - summaryW;
  doc.save();
  doc.fillColor(colors.soft);
  doc.roundedRect(summaryX, summaryY, summaryW, summaryH, 8).fill();
  doc.restore();
  doc.save();
  doc.strokeColor(colors.border).lineWidth(1);
  doc.roundedRect(summaryX, summaryY, summaryW, summaryH, 8).stroke();
  doc.restore();
  doc.fillColor(colors.muted).font("Helvetica-Bold").fontSize(8).text("RESUMO FINANCEIRO", summaryX + 10, summaryY + 8, {
    width: summaryW - 20,
  });
  doc.fillColor(colors.text).font("Helvetica").fontSize(9).text("Subtotal", summaryX + 10, summaryY + 25, {
    width: summaryW - 20,
  });
  doc.text(`R$ ${formatCurrency(totals.subtotal)}`, summaryX + 10, summaryY + 25, {
    width: summaryW - 20,
    align: "right",
  });
  doc.text(`Desconto (${Number(input.discount || 0).toFixed(2)}%)`, summaryX + 10, summaryY + 40, {
    width: summaryW - 20,
  });
  doc.text(`- R$ ${formatCurrency(totals.discount_amount)}`, summaryX + 10, summaryY + 40, {
    width: summaryW - 20,
    align: "right",
  });
  doc.fillColor(colors.success).font("Helvetica-Bold").fontSize(10).text("Total final", summaryX + 10, summaryY + 56, {
    width: summaryW - 20,
  });
  doc.text(`R$ ${formatCurrency(totals.total)}`, summaryX + 10, summaryY + 56, {
    width: summaryW - 20,
    align: "right",
  });

  const notesTextRaw = input.notes?.trim() || "Sem observacoes adicionais registradas.";
  const notesText = notesTextRaw.length > 220 ? `${notesTextRaw.slice(0, 217)}...` : notesTextRaw;
  const notesY = summaryY + summaryH + 14;
  doc.fillColor(colors.text).font("Helvetica-Bold").fontSize(10).text("Observacoes", left, notesY, {
    width: contentWidth,
  });
  doc.save();
  doc.fillColor(colors.white);
  doc.roundedRect(left, notesY + 14, contentWidth, 46, 8).fill();
  doc.restore();
  doc.save();
  doc.strokeColor(colors.border).lineWidth(1);
  doc.roundedRect(left, notesY + 14, contentWidth, 46, 8).stroke();
  doc.restore();
  doc.fillColor(colors.text).font("Helvetica").fontSize(8.8).text(notesText, left + 10, notesY + 23, {
    width: contentWidth - 20,
  });

  const clausesY = notesY + 70;
  doc.fillColor(colors.text).font("Helvetica-Bold").fontSize(10).text("Clausulas essenciais", left, clausesY, {
    width: contentWidth,
  });
  doc.fillColor(colors.muted).font("Helvetica").fontSize(8.4).text(
    "Este documento formaliza os procedimentos descritos, valores e condicoes comerciais. Ajustes de escopo ou valores exigem novo aceite entre clinica e paciente. Proposta valida por 30 dias a partir da emissao.",
    left,
    clausesY + 13,
    { width: contentWidth, align: "justify" }
  );

  const signaturesY = doc.page.height - doc.page.margins.bottom - 84;
  const signGap = 18;
  const signW = (contentWidth - signGap) / 2;
  doc.save();
  doc.strokeColor("#9FB4CA").lineWidth(1);
  doc.moveTo(left, signaturesY).lineTo(left + signW, signaturesY).stroke();
  doc.moveTo(left + signW + signGap, signaturesY).lineTo(right, signaturesY).stroke();
  doc.restore();
  doc.fillColor(colors.text).font("Helvetica").fontSize(9).text("Assinatura do paciente", left, signaturesY + 6, {
    width: signW,
    align: "center",
  });
  doc.text("Assinatura da clinica", left + signW + signGap, signaturesY + 6, {
    width: signW,
    align: "center",
  });
  doc.fillColor(colors.muted).font("Helvetica").fontSize(8.2).text(
    `Documento digital emitido em ${issueDateLabel} | Referencia: ${contractCode}`,
    left,
    doc.page.height - doc.page.margins.bottom - 18,
    { width: contentWidth, align: "center" }
  );

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

async function removeBudgetContracts(input: {
  clinicId: string;
  patientId: string;
  budgetId: string;
}) {
  const prefix = buildBudgetContractPrefix(input.budgetId);
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("attachments")
    .select("id, file_path, file_name")
    .eq("clinic_id", input.clinicId)
    .eq("patient_id", input.patientId)
    .eq("category", "contract")
    .like("file_name", `${prefix}%`);

  if (error) {
    throw new Error(`Falha ao buscar contratos para exclusao: ${error.message}`);
  }

  const items = data ?? [];
  const paths = items.map((item) => String(item.file_path ?? ""));
  await removeStorageFiles(paths);

  if (items.length > 0) {
    const ids = items.map((item) => String(item.id ?? "")).filter(Boolean);
    if (ids.length > 0) {
      const { error: deleteError } = await admin
        .from("attachments")
        .delete()
        .eq("clinic_id", input.clinicId)
        .in("id", ids);
      if (deleteError) {
        throw new Error(`Falha ao remover anexos de contrato: ${deleteError.message}`);
      }
    }
  }
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
  const budget = await getBudgetById(clinicId, budgetId);
  if (!budget) {
    throw new Error("Orcamento nao encontrado.");
  }
  await removeBudgetContracts({
    clinicId,
    patientId: budget.patient_id,
    budgetId,
  });
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
