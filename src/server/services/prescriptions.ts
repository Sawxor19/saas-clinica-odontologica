import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { auditLog } from "@/server/audit/auditLog";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { createAttachment } from "@/server/repositories/attachments";
import { getClinicById } from "@/server/repositories/clinics";
import { listPatientsByIds } from "@/server/repositories/patients";
import { listProfilesByIds } from "@/server/repositories/profiles";
import {
  ClinicalDocumentType,
  createPrescription,
  listPrescriptionsByPatient,
} from "@/server/repositories/prescriptions";

const STORAGE_BUCKET = "clinic-attachments";

const DOCUMENT_LABELS: Record<ClinicalDocumentType, string> = {
  prescription: "Receita",
  certificate: "Atestado",
  clinical_document: "Documento clinico",
};

const DOCUMENT_SUBTITLES: Record<ClinicalDocumentType, string> = {
  prescription: "Documento de orientacao terapeutica e posologia.",
  certificate: "Declaracao clinica para fins de justificativa e acompanhamento.",
  clinical_document: "Registro clinico formal emitido pelo profissional responsavel.",
};

function normalizeDocumentType(value: string): ClinicalDocumentType {
  if (value === "certificate" || value === "clinical_document") return value;
  return "prescription";
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function buildDocumentPdf(input: {
  clinicName: string;
  professionalName: string;
  patientName: string;
  title: string;
  content: string;
  type: ClinicalDocumentType;
}) {
  const doc = new PDFDocument({ margin: 36, size: "A4" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const colors = {
    primary: "#0F3D66",
    primaryStrong: "#0B2E4F",
    soft: "#EEF4FB",
    border: "#D3DFEC",
    text: "#1F2937",
    muted: "#5E7186",
    white: "#FFFFFF",
  };

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const contentWidth = right - left;
  const now = new Date();
  const issueDateLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  const documentCode = `${input.type.slice(0, 3).toUpperCase()}-${String(now.getTime()).slice(-7)}`;

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
    doc.fillColor(colors.muted).font("Helvetica-Bold").fontSize(8).text(label, x + 10, y + 7, {
      width: width - 20,
    });
    doc.fillColor(colors.text).font("Helvetica").fontSize(9.5).text(value || "-", x + 10, y + 20, {
      width: width - 20,
    });
  };

  doc.save();
  doc.fillColor(colors.primary);
  doc.rect(0, 0, doc.page.width, 78).fill();
  doc.restore();
  doc.fillColor(colors.white).font("Helvetica-Bold").fontSize(17).text(
    `${DOCUMENT_LABELS[input.type].toUpperCase()} CLINICA`,
    left,
    24,
    { width: contentWidth }
  );
  doc.fillColor("#D8E6F5").font("Helvetica").fontSize(9).text(
    DOCUMENT_SUBTITLES[input.type],
    left,
    47,
    { width: contentWidth }
  );

  const cardTop = 92;
  const gap = 10;
  const cardW = (contentWidth - gap) / 2;
  const cardH = 46;
  drawCard(left, cardTop, cardW, cardH, "CLINICA", input.clinicName || "Clinica");
  drawCard(left + cardW + gap, cardTop, cardW, cardH, "PACIENTE", input.patientName || "Paciente");
  drawCard(left, cardTop + cardH + 8, cardW, cardH, "PROFISSIONAL RESPONSAVEL", input.professionalName);
  drawCard(left + cardW + gap, cardTop + cardH + 8, cardW, cardH, "EMISSAO / CODIGO", `${issueDateLabel} | ${documentCode}`);

  const contentTop = 206;
  doc.fillColor(colors.text).font("Helvetica-Bold").fontSize(11).text(input.title, left, contentTop, {
    width: contentWidth,
  });
  const bodyY = contentTop + 16;
  const bodyHeight = 256;

  doc.save();
  doc.fillColor(colors.white);
  doc.roundedRect(left, bodyY, contentWidth, bodyHeight, 8).fill();
  doc.restore();
  doc.save();
  doc.strokeColor(colors.border).lineWidth(1);
  doc.roundedRect(left, bodyY, contentWidth, bodyHeight, 8).stroke();
  doc.restore();
  doc.fillColor(colors.text).font("Helvetica").fontSize(10).text(input.content, left + 12, bodyY + 12, {
    width: contentWidth - 24,
    height: bodyHeight - 24,
    align: "justify",
  });

  doc.fillColor(colors.muted).font("Helvetica").fontSize(8.5).text(
    "Documento emitido digitalmente no prontuario da clinica.",
    left,
    bodyY + bodyHeight + 8,
    { width: contentWidth }
  );

  const signY = doc.page.height - doc.page.margins.bottom - 62;
  doc.save();
  doc.strokeColor("#9FB4CA").lineWidth(1);
  doc.moveTo(left, signY).lineTo(right, signY).stroke();
  doc.restore();
  doc.fillColor(colors.text).font("Helvetica").fontSize(9).text("Assinatura e carimbo profissional", left, signY + 6, {
    width: contentWidth,
    align: "center",
  });
  doc.fillColor(colors.muted).font("Helvetica").fontSize(8).text(
    `Ref.: ${documentCode}`,
    left,
    signY + 22,
    { width: contentWidth, align: "center" }
  );

  doc.end();
  await new Promise<void>((resolve) => doc.on("end", () => resolve()));
  return Buffer.concat(chunks);
}

async function storeClinicalDocument(input: {
  clinicId: string;
  patientId: string;
  fileName: string;
  pdf: Buffer;
}) {
  const path = `${input.clinicId}/${input.patientId}/${Date.now()}-${input.fileName}`;
  const admin = supabaseAdmin();
  const { error } = await admin.storage.from(STORAGE_BUCKET).upload(path, input.pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) {
    throw new Error(`Falha ao salvar documento no storage: ${error.message}`);
  }
  return path;
}

async function removeClinicalDocumentFile(clinicId: string, patientId: string, filePath: string) {
  const admin = supabaseAdmin();
  await admin
    .from("attachments")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .eq("file_path", filePath);

  const { error } = await admin.storage.from(STORAGE_BUCKET).remove([filePath]);
  if (error && !error.message.toLowerCase().includes("not found")) {
    throw new Error(`Falha ao remover arquivo do storage: ${error.message}`);
  }
}

export async function getPrescriptionsByPatient(patientId: string) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "readClinical");
  const items = await listPrescriptionsByPatient(clinicId, patientId);
  await auditLog({
    clinicId,
    userId,
    action: "prescriptions.list",
    entity: "prescription",
    metadata: { patientId },
  });
  return items;
}

export async function issueClinicalDocument(input: {
  patient_id: string;
  type: string;
  title: string;
  content: string;
}) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writePrescriptions");

  const type = normalizeDocumentType(input.type);
  const title = input.title.trim() || DOCUMENT_LABELS[type];
  const content = input.content.trim();
  if (!content) {
    throw new Error("Escreva o conteudo do documento.");
  }

  const [clinic, patients, profiles] = await Promise.all([
    getClinicById(clinicId),
    listPatientsByIds(clinicId, [input.patient_id]),
    listProfilesByIds(clinicId, [userId]),
  ]);

  const patient = patients[0];
  if (!patient) {
    throw new Error("Paciente nao encontrado.");
  }

  const professionalName = profiles[0]?.full_name
    ? String(profiles[0].full_name)
    : "Profissional responsavel";
  const patientName = String(patient.full_name ?? "Paciente");

  const pdf = await buildDocumentPdf({
    clinicName: String(clinic.name ?? "Clinica"),
    professionalName,
    patientName,
    title,
    content,
    type,
  });

  const shortType = sanitizeFileName(DOCUMENT_LABELS[type]);
  const shortTitle = sanitizeFileName(title);
  const fileName = `${shortType}-${shortTitle || "documento"}-${Date.now()}.pdf`;
  const filePath = await storeClinicalDocument({
    clinicId,
    patientId: input.patient_id,
    fileName,
    pdf,
  });

  await createAttachment(clinicId, {
    patient_id: input.patient_id,
    file_path: filePath,
    file_name: fileName,
    category: type,
  });

  const created = await createPrescription(clinicId, {
    patient_id: input.patient_id,
    dentist_id: userId,
    content,
    document_type: type,
    title,
    file_path: filePath,
    file_name: fileName,
  });

  await auditLog({
    clinicId,
    userId,
    action: "prescriptions.create",
    entity: "prescription",
    entityId: created.id,
    metadata: {
      patientId: input.patient_id,
      type,
      fileName,
    },
  });

  return created;
}

export async function removeClinicalDocument(input: {
  patient_id: string;
  document_id: string;
}) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "writePrescriptions");

  const admin = supabaseAdmin();
  const { data: existing, error: existingError } = await admin
    .from("prescriptions")
    .select("id, patient_id, file_path, file_name")
    .eq("clinic_id", clinicId)
    .eq("id", input.document_id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }
  if (!existing) {
    throw new Error("Documento clinico nao encontrado.");
  }
  if (String(existing.patient_id ?? "") !== input.patient_id) {
    throw new Error("Documento nao pertence ao paciente informado.");
  }

  const { error: deleteError } = await admin
    .from("prescriptions")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("id", input.document_id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const filePath = String(existing.file_path ?? "");
  if (filePath) {
    await removeClinicalDocumentFile(clinicId, input.patient_id, filePath);
  }

  await auditLog({
    clinicId,
    userId,
    action: "prescriptions.delete",
    entity: "prescription",
    entityId: input.document_id,
    metadata: {
      patientId: input.patient_id,
      fileName: existing.file_name ?? null,
    },
  });
}
