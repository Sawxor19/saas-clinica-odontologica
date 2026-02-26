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
  const doc = new PDFDocument({ margin: 44, size: "A4" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const totals = calculateTotals(input.items, input.discount);
  const issueDate = new Date();
  const issueDateLabel = issueDate.toLocaleString("pt-BR");
  const validityDate = new Date(issueDate);
  validityDate.setDate(validityDate.getDate() + 30);
  const validityDateLabel = validityDate.toLocaleDateString("pt-BR");
  const contractCode = `ORC-${input.budgetId.slice(0, 8).toUpperCase()}`;

  const colors = {
    primary: "#0F3D66",
    primaryStrong: "#0B2E4F",
    primarySoft: "#EAF2FB",
    surface: "#F8FAFC",
    text: "#1F2937",
    muted: "#64748B",
    border: "#D7E2EE",
    borderStrong: "#BFCFDF",
    white: "#FFFFFF",
    success: "#0F766E",
  };

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const contentWidth = right - left;
  const bottomLimit = () => doc.page.height - doc.page.margins.bottom;
  let y = doc.page.margins.top;

  const drawBox = (
    x: number,
    top: number,
    width: number,
    height: number,
    fill: string,
    stroke: string,
    radius = 0
  ) => {
    doc.save();
    doc.fillColor(fill);
    if (radius > 0) {
      doc.roundedRect(x, top, width, height, radius).fill();
    } else {
      doc.rect(x, top, width, height).fill();
    }
    doc.restore();

    doc.save();
    doc.strokeColor(stroke).lineWidth(1);
    if (radius > 0) {
      doc.roundedRect(x, top, width, height, radius).stroke();
    } else {
      doc.rect(x, top, width, height).stroke();
    }
    doc.restore();
  };

  const ensureSpace = (height: number, onNewPage?: () => void) => {
    if (y + height <= bottomLimit()) return;
    doc.addPage();
    y = doc.page.margins.top;
    if (onNewPage) onNewPage();
  };

  const drawPageContinuationHeader = (title: string) => {
    drawBox(left, y, contentWidth, 30, colors.surface, colors.border, 8);
    doc.fillColor(colors.text).font("Helvetica-Bold").fontSize(10).text(title, left + 12, y + 10, {
      width: contentWidth - 24,
    });
    y += 42;
  };

  const drawInfoCard = (
    x: number,
    top: number,
    width: number,
    height: number,
    label: string,
    value: string
  ) => {
    drawBox(x, top, width, height, colors.surface, colors.border, 10);
    doc.fillColor(colors.muted).font("Helvetica-Bold").fontSize(8).text(label, x + 12, top + 9, {
      width: width - 24,
    });
    doc.fillColor(colors.text).font("Helvetica").fontSize(10.5).text(value || "-", x + 12, top + 24, {
      width: width - 24,
      height: height - 28,
    });
  };

  const drawSectionHeading = (title: string, subtitle?: string) => {
    ensureSpace(subtitle ? 28 : 20);
    doc.fillColor(colors.text).font("Helvetica-Bold").fontSize(12).text(title, left, y, {
      width: contentWidth,
    });
    if (subtitle) {
      doc.fillColor(colors.muted).font("Helvetica").fontSize(9).text(subtitle, left, y + 14, {
        width: contentWidth,
      });
      y += 30;
      return;
    }
    y += 20;
  };

  drawBox(0, 0, doc.page.width, 124, colors.primary, colors.primary, 0);
  drawBox(0, 104, doc.page.width, 20, colors.primaryStrong, colors.primaryStrong, 0);
  doc.fillColor(colors.white).font("Helvetica-Bold").fontSize(20).text(
    "CONTRATO DE TRATAMENTO ODONTOLOGICO",
    left,
    36,
    { width: contentWidth }
  );
  doc.fillColor("#D6E6F7").font("Helvetica").fontSize(10).text(
    "Instrumento particular para formalizacao do plano de tratamento e condicoes comerciais.",
    left,
    66,
    { width: contentWidth }
  );
  doc.fillColor(colors.white).font("Helvetica-Bold").fontSize(9).text(
    `Codigo: ${contractCode}`,
    left,
    91,
    { width: contentWidth / 2 }
  );
  doc.fillColor("#D6E6F7").font("Helvetica").fontSize(9).text(`Emissao: ${issueDateLabel}`, left, 91, {
    width: contentWidth,
    align: "right",
  });

  y = 138;
  const cardGap = 12;
  const cardWidth = (contentWidth - cardGap) / 2;
  const cardHeight = 60;
  drawInfoCard(left, y, cardWidth, cardHeight, "DADOS DA CLINICA", input.clinicName || "Clinica");
  drawInfoCard(left + cardWidth + cardGap, y, cardWidth, cardHeight, "PACIENTE", input.patientName || "Paciente");
  y += cardHeight + 10;
  drawInfoCard(left, y, cardWidth, cardHeight, "IDENTIFICACAO DO ORCAMENTO", contractCode);
  drawInfoCard(
    left + cardWidth + cardGap,
    y,
    cardWidth,
    cardHeight,
    "VALIDADE DA PROPOSTA",
    `${validityDateLabel} (30 dias)`
  );
  y += cardHeight + 18;

  drawSectionHeading("Plano de procedimentos", "Itens aprovados para execucao clinica e valores por procedimento.");
  const tableX = left;
  const tableWidth = contentWidth;
  const headerHeight = 24;
  const colWidths = [
    tableWidth * 0.5,
    tableWidth * 0.12,
    tableWidth * 0.18,
    tableWidth * 0.2,
  ];

  const drawTableHeader = () => {
    drawBox(tableX, y, tableWidth, headerHeight, colors.primaryStrong, colors.primaryStrong, 6);
    doc.fillColor(colors.white).font("Helvetica-Bold").fontSize(9);
    doc.text("Procedimento", tableX + 10, y + 7, { width: colWidths[0] - 16 });
    doc.text("Qtd", tableX + colWidths[0], y + 7, { width: colWidths[1], align: "center" });
    doc.text("Valor unit.", tableX + colWidths[0] + colWidths[1], y + 7, {
      width: colWidths[2] - 10,
      align: "right",
    });
    doc.text("Total", tableX + colWidths[0] + colWidths[1] + colWidths[2], y + 7, {
      width: colWidths[3] - 10,
      align: "right",
    });
    y += headerHeight;
  };

  ensureSpace(headerHeight + 24, () => drawPageContinuationHeader("Contrato - continuidade"));
  drawTableHeader();

  input.items.forEach((item, index) => {
    const rowTitle = `${index + 1}. ${item.procedure_name}`;
    const titleHeight = doc.heightOfString(rowTitle, {
      width: colWidths[0] - 16,
      align: "left",
    });
    const rowHeight = Math.max(24, titleHeight + 10);

    ensureSpace(rowHeight + 2, () => {
      drawPageContinuationHeader("Plano de procedimentos - continuidade");
      drawTableHeader();
    });

    const rowFill = index % 2 === 0 ? colors.white : colors.surface;
    drawBox(tableX, y, tableWidth, rowHeight, rowFill, colors.border, 0);
    const c1 = tableX + colWidths[0];
    const c2 = c1 + colWidths[1];
    const c3 = c2 + colWidths[2];
    doc.save();
    doc.strokeColor(colors.borderStrong).lineWidth(0.6);
    doc.moveTo(c1, y).lineTo(c1, y + rowHeight).stroke();
    doc.moveTo(c2, y).lineTo(c2, y + rowHeight).stroke();
    doc.moveTo(c3, y).lineTo(c3, y + rowHeight).stroke();
    doc.restore();

    const lineTotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
    doc.fillColor(colors.text).font("Helvetica").fontSize(9).text(rowTitle, tableX + 8, y + 6, {
      width: colWidths[0] - 16,
    });
    doc.fillColor(colors.text).font("Helvetica").fontSize(9).text(String(item.quantity), c1, y + 6, {
      width: colWidths[1],
      align: "center",
    });
    doc.fillColor(colors.text).font("Helvetica").fontSize(9).text(`R$ ${formatCurrency(item.unit_price)}`, c2 + 4, y + 6, {
      width: colWidths[2] - 10,
      align: "right",
    });
    doc.fillColor(colors.text).font("Helvetica-Bold").fontSize(9).text(`R$ ${formatCurrency(lineTotal)}`, c3 + 4, y + 6, {
      width: colWidths[3] - 10,
      align: "right",
    });
    y += rowHeight;
  });

  y += 12;
  const summaryWidth = 250;
  const summaryHeight = 88;
  ensureSpace(summaryHeight + 10, () => drawPageContinuationHeader("Resumo financeiro"));
  const summaryX = right - summaryWidth;
  drawBox(summaryX, y, summaryWidth, summaryHeight, colors.primarySoft, colors.borderStrong, 10);
  doc.fillColor(colors.muted).font("Helvetica-Bold").fontSize(8).text("RESUMO FINANCEIRO", summaryX + 12, y + 9, {
    width: summaryWidth - 24,
  });
  doc.fillColor(colors.text).font("Helvetica").fontSize(9).text("Subtotal", summaryX + 12, y + 28, {
    width: summaryWidth - 24,
  });
  doc.text(`R$ ${formatCurrency(totals.subtotal)}`, summaryX + 12, y + 28, {
    width: summaryWidth - 24,
    align: "right",
  });
  doc.fillColor(colors.text).font("Helvetica").fontSize(9).text(
    `Desconto (${Number(input.discount || 0).toFixed(2)}%)`,
    summaryX + 12,
    y + 44,
    { width: summaryWidth - 24 }
  );
  doc.text(`- R$ ${formatCurrency(totals.discount_amount)}`, summaryX + 12, y + 44, {
    width: summaryWidth - 24,
    align: "right",
  });
  doc.fillColor(colors.success).font("Helvetica-Bold").fontSize(10).text("Total final", summaryX + 12, y + 62, {
    width: summaryWidth - 24,
  });
  doc.text(`R$ ${formatCurrency(totals.total)}`, summaryX + 12, y + 62, {
    width: summaryWidth - 24,
    align: "right",
  });
  y += summaryHeight + 14;

  if (input.notes) {
    drawSectionHeading("Observacoes adicionais");
    const notesText = input.notes.trim();
    const notesHeight = Math.max(
      52,
      doc.heightOfString(notesText, {
        width: contentWidth - 24,
      }) + 24
    );
    ensureSpace(notesHeight + 10, () => drawPageContinuationHeader("Observacoes"));
    drawBox(left, y, contentWidth, notesHeight, colors.surface, colors.border, 10);
    doc.fillColor(colors.text).font("Helvetica").fontSize(9.5).text(notesText, left + 12, y + 12, {
      width: contentWidth - 24,
    });
    y += notesHeight + 14;
  }

  drawSectionHeading("Clausulas contratuais");
  const clauses = [
    "1. Objeto: o presente contrato formaliza o plano de tratamento odontologico acima, incluindo escopo, etapas e previsao financeira.",
    "2. Condicoes financeiras: os valores apresentados neste documento refletem os procedimentos aprovados, podendo existir ajuste somente por acordo entre as partes.",
    "3. Cancelamento e revisao: qualquer alteracao relevante no plano clinico ou no cronograma deve ser registrada e validada pela clinica e pelo paciente.",
    "4. Vigencia: esta proposta possui validade de 30 dias a contar da data de emissao, salvo condicao comercial distinta registrada por escrito.",
  ].join("\n\n");
  const clausesHeight = Math.max(
    138,
    doc.heightOfString(clauses, {
      width: contentWidth - 24,
      align: "left",
    }) + 30
  );
  ensureSpace(clausesHeight + 14, () => drawPageContinuationHeader("Clausulas contratuais"));
  drawBox(left, y, contentWidth, clausesHeight, colors.surface, colors.border, 10);
  doc.fillColor(colors.text).font("Helvetica").fontSize(9).text(clauses, left + 12, y + 14, {
    width: contentWidth - 24,
    align: "left",
  });
  y += clausesHeight + 18;

  ensureSpace(110, () => drawPageContinuationHeader("Assinaturas"));
  drawSectionHeading("Assinaturas e aceite final");
  const signatureGap = 16;
  const signatureWidth = (contentWidth - signatureGap) / 2;
  const signatureY = y + 24;
  doc.save();
  doc.strokeColor(colors.borderStrong).lineWidth(1);
  doc.moveTo(left, signatureY).lineTo(left + signatureWidth, signatureY).stroke();
  doc.moveTo(left + signatureWidth + signatureGap, signatureY)
    .lineTo(left + signatureWidth + signatureGap + signatureWidth, signatureY)
    .stroke();
  doc.restore();
  doc.fillColor(colors.text).font("Helvetica").fontSize(9).text("Assinatura do paciente", left, signatureY + 6, {
    width: signatureWidth,
    align: "center",
  });
  doc.text("Assinatura da clinica", left + signatureWidth + signatureGap, signatureY + 6, {
    width: signatureWidth,
    align: "center",
  });
  doc.fillColor(colors.muted).font("Helvetica").fontSize(8.5).text(
    `Local e data: ___________________________    Codigo do documento: ${contractCode}`,
    left,
    signatureY + 34,
    { width: contentWidth }
  );

  const footerY = doc.page.height - doc.page.margins.bottom + 8;
  doc.fillColor(colors.muted).font("Helvetica").fontSize(8).text(
    `Documento digital gerado em ${issueDateLabel}`,
    left,
    footerY,
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
