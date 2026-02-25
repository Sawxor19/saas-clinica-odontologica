import PDFDocument from "pdfkit";
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
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  doc.fontSize(16).text(DOCUMENT_LABELS[input.type]);
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Clinica: ${input.clinicName}`);
  doc.fontSize(10).text(`Paciente: ${input.patientName}`);
  doc.fontSize(10).text(`Profissional: ${input.professionalName}`);
  doc.fontSize(10).text(`Data: ${new Date().toLocaleString("pt-BR")}`);
  doc.moveDown();
  doc.fontSize(12).text(input.title);
  doc.moveDown(0.5);
  doc.fontSize(10).text(input.content, { align: "left" });

  doc.moveDown(3);
  doc.fontSize(10).text("Assinatura: ______________________________________________");

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
