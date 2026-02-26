"use server";

import { revalidatePath } from "next/cache";
import { addClinicalNote } from "@/server/services/clinicalNotes";
import { addAttachment, removeAttachment } from "@/server/services/attachments";
import { saveOdontogram } from "@/server/services/odontograms";
import { updatePatientPhotoItem } from "@/server/services/patients";
import { issueClinicalDocument, removeClinicalDocument } from "@/server/services/prescriptions";

export async function addClinicalNoteAction(formData: FormData) {
  const patientId = String(formData.get("patient_id") || "");
  const note = String(formData.get("note") || "").trim();
  if (!patientId || !note) return;

  await addClinicalNote(patientId, note);
  revalidatePath(`/dashboard/patients/${patientId}`);
}

export async function addAttachmentAction(formData: FormData) {
  const patientId = String(formData.get("patient_id") || "");
  const category = String(formData.get("category") || "document");
  const file = formData.get("file") as File | null;
  if (!patientId || !file) return;

  await addAttachment({ patient_id: patientId, file, category });
  revalidatePath(`/dashboard/patients/${patientId}`);
}

export async function deleteAttachmentAction(formData: FormData) {
  const patientId = String(formData.get("patient_id") || "");
  const attachmentId = String(formData.get("attachment_id") || "");
  const filePath = String(formData.get("file_path") || "");
  if (!patientId || !attachmentId || !filePath) return;
  await removeAttachment(attachmentId, filePath);
  revalidatePath(`/dashboard/patients/${patientId}`);
}

export async function saveOdontogramAction(formData: FormData) {
  const patientId = String(formData.get("patient_id") || "");
  const raw = String(formData.get("data") || "{}");
  if (!patientId) return;
  const data = JSON.parse(raw) as Record<string, unknown>;
  await saveOdontogram(patientId, data);
  revalidatePath(`/dashboard/patients/${patientId}`);
}

export async function updatePatientPhotoAction(formData: FormData) {
  const patientId = String(formData.get("patient_id") || "");
  const file = formData.get("photo") as File | null;
  if (!patientId || !file) return;

  const upload = await addAttachment({
    patient_id: patientId,
    file,
    category: "photo",
  });
  await updatePatientPhotoItem(patientId, upload.path);
  revalidatePath(`/dashboard/patients/${patientId}`);
}

export async function issueClinicalDocumentAction(formData: FormData) {
  const patientId = String(formData.get("patient_id") || "");
  if (!patientId) return;

  await issueClinicalDocument({
    patient_id: patientId,
    type: String(formData.get("document_type") || "prescription"),
    title: String(formData.get("title") || ""),
    content: String(formData.get("content") || ""),
  });

  revalidatePath(`/dashboard/patients/${patientId}`);
}

export async function deleteClinicalDocumentAction(formData: FormData) {
  const patientId = String(formData.get("patient_id") || "");
  const documentId = String(formData.get("document_id") || "");
  if (!patientId || !documentId) return;

  await removeClinicalDocument({
    patient_id: patientId,
    document_id: documentId,
  });

  revalidatePath(`/dashboard/patients/${patientId}`);
}
