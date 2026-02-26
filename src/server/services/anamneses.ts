import crypto from "crypto";
import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import {
  AnamnesisFieldInput,
  AnamnesisFieldType,
  AnamnesisFormStatus,
  AnamnesisRepository,
} from "@/server/repositories/anamneses";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { removeStorageFiles } from "@/server/storage/cleanup";

const SIGNATURE_BUCKET = "clinic-attachments";

const FIELD_TYPES: AnamnesisFieldType[] = [
  "text",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "date",
  "yes_no",
  "number",
];

type BuilderFieldInput = {
  label: string;
  help_text?: string | null;
  type: AnamnesisFieldType;
  required?: boolean;
  order_index?: number;
  options?: string[] | null;
  validation?: Record<string, unknown> | null;
};

type SaveFormInput = {
  title: string;
  description?: string | null;
  fields: BuilderFieldInput[];
  intent?: "save" | "publish" | "archive";
};

type PublicSubmitPayload = {
  patient_id?: string | null;
  patient_name?: string | null;
  patient_email?: string | null;
  signature_data: string;
  answers: Record<string, unknown>;
};

type SignatureDecoded = {
  mime: string;
  buffer: Buffer;
};

function generatePublicSlug() {
  return crypto.randomBytes(6).toString("base64url").toLowerCase();
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptions(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  return normalized.length > 0 ? normalized : null;
}

function normalizeFieldType(value: unknown): AnamnesisFieldType {
  if (typeof value === "string" && FIELD_TYPES.includes(value as AnamnesisFieldType)) {
    return value as AnamnesisFieldType;
  }
  return "text";
}

function sanitizeFields(fields: BuilderFieldInput[]): AnamnesisFieldInput[] {
  return fields
    .map((field, index) => {
      const type = normalizeFieldType(field.type);
      const label = normalizeText(field.label);
      if (!label) return null;

      const parsed: AnamnesisFieldInput = {
        label,
        help_text: normalizeText(field.help_text ?? "") || null,
        type,
        required: Boolean(field.required),
        order_index: Number.isFinite(field.order_index) ? Number(field.order_index) : index,
        options: normalizeOptions(field.options),
        validation:
          field.validation && typeof field.validation === "object"
            ? field.validation
            : null,
      };

      if ((type === "select" || type === "radio" || type === "checkbox") && !parsed.options) {
        parsed.options = ["Opcao 1"];
      }

      return parsed;
    })
    .filter((field): field is AnamnesisFieldInput => Boolean(field))
    .sort((a, b) => a.order_index - b.order_index)
    .map((field, index) => ({
      ...field,
      order_index: index,
    }));
}

function decodeDataUrl(dataUrl: string): SignatureDecoded {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Assinatura invalida.");
  }
  const [, mime, base64] = match;
  return {
    mime,
    buffer: Buffer.from(base64, "base64"),
  };
}

function isEmptyAnswer(value: unknown) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function normalizeAnswerByType(type: AnamnesisFieldType, raw: unknown) {
  if (type === "checkbox") {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
  }

  if (type === "yes_no") {
    if (typeof raw === "boolean") return raw;
    if (typeof raw !== "string") return null;
    const value = raw.toLowerCase();
    if (value === "sim" || value === "yes" || value === "true") return true;
    if (value === "nao" || value === "não" || value === "no" || value === "false") return false;
    return null;
  }

  if (type === "number") {
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
    if (typeof raw !== "string") return null;
    const normalized = raw.replace(",", ".").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (type === "date") {
    if (typeof raw !== "string") return null;
    const value = raw.trim();
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  if (typeof raw === "string") return raw.trim();
  return "";
}

async function createSignatureFilePath(input: {
  clinicId: string;
  patientId: string | null;
  signatureData: string;
}) {
  const decoded = decodeDataUrl(input.signatureData);
  const extension = decoded.mime.includes("png")
    ? "png"
    : decoded.mime.includes("jpeg")
      ? "jpg"
      : "img";
  const path = `${input.clinicId}/${input.patientId ?? "anamneses"}/${Date.now()}-anamnesis-signature.${extension}`;
  const admin = supabaseAdmin();
  const { error } = await admin.storage.from(SIGNATURE_BUCKET).upload(path, decoded.buffer, {
    contentType: decoded.mime,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return path;
}

export class AnamnesisService {
  constructor(private readonly repository = new AnamnesisRepository()) {}

  async listFormsByClinic() {
    const { clinicId, permissions } = await getClinicContext();
    assertPermission(permissions, "readPatients");
    return this.repository.listFormsByClinic(clinicId);
  }

  async getForm(formId: string) {
    const { clinicId, permissions } = await getClinicContext();
    assertPermission(permissions, "readPatients");
    return this.repository.getForm(formId, clinicId);
  }

  async createForm(title?: string) {
    const { clinicId, userId, permissions } = await getClinicContext();
    assertPermission(permissions, "readPatients");

    const normalizedTitle = normalizeText(title) || "Nova anamnese";

    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const form = await this.repository.createForm({
          clinicId,
          createdBy: userId,
          title: normalizedTitle,
          publicSlug: generatePublicSlug(),
        });
        return form;
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (!message.includes("duplicate") && !message.includes("unique")) {
          throw error;
        }
      }
    }

    throw new Error("Nao foi possivel gerar link publico da anamnese.");
  }

  async saveForm(formId: string, input: SaveFormInput) {
    const { clinicId, permissions } = await getClinicContext();
    assertPermission(permissions, "readPatients");

    const fields = sanitizeFields(input.fields ?? []);
    const intent = input.intent ?? "save";
    if (intent === "publish" && fields.length === 0) {
      throw new Error("Adicione ao menos 1 campo para publicar.");
    }

    let nextStatus: AnamnesisFormStatus | undefined;
    if (intent === "publish") nextStatus = "published";
    if (intent === "archive") nextStatus = "archived";

    await this.repository.updateForm(formId, clinicId, {
      title: normalizeText(input.title) || "Anamnese sem titulo",
      description: normalizeText(input.description ?? "") || null,
      status: nextStatus,
    });
    await this.repository.upsertFields(formId, clinicId, fields);

    return this.repository.getForm(formId, clinicId);
  }

  async deleteForm(formId: string) {
    const { clinicId, permissions } = await getClinicContext();
    assertPermission(permissions, "readPatients");
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("anamnesis_responses")
      .select("signature_url")
      .eq("clinic_id", clinicId)
      .eq("form_id", formId);

    if (error) {
      throw new Error(error.message);
    }

    const signaturePaths = (data ?? []).map((item) => String(item.signature_url ?? ""));
    await removeStorageFiles(signaturePaths);
    await this.repository.deleteForm(formId, clinicId);
  }

  async setFormStatus(formId: string, status: AnamnesisFormStatus) {
    const { clinicId, permissions } = await getClinicContext();
    assertPermission(permissions, "readPatients");
    await this.repository.updateForm(formId, clinicId, { status });
  }

  async getFormByPublicSlug(slug: string) {
    return this.repository.getFormByPublicSlug(slug);
  }

  async submitPublicForm(slug: string, payload: PublicSubmitPayload) {
    const form = await this.repository.getFormByPublicSlug(slug);
    if (!form) {
      throw new Error("Anamnese nao encontrada.");
    }
    if (form.fields.length === 0) {
      throw new Error("Anamnese sem campos.");
    }

    const rawAnswers = payload.answers ?? {};
    const normalizedAnswers = form.fields.map((field) => {
      const rawValue = rawAnswers[field.id];
      const normalized = normalizeAnswerByType(field.type, rawValue);
      if (field.required && isEmptyAnswer(normalized)) {
        throw new Error(`Preencha o campo obrigatorio: ${field.label}`);
      }
      return {
        fieldId: field.id,
        answer: normalized,
      };
    });

    const patientName = normalizeText(payload.patient_name ?? "");
    const patientEmail = normalizeText(payload.patient_email ?? "").toLowerCase() || null;
    const requestedPatientId = normalizeText(payload.patient_id ?? "") || null;

    let patientId: string | null = null;
    let currentSignaturePath: string | null = null;

    if (requestedPatientId) {
      const existingPatient = await this.repository.findPatientById(
        form.clinic_id,
        requestedPatientId
      );
      if (existingPatient) {
        patientId = existingPatient.id;
        currentSignaturePath = existingPatient.signature_path;
      }
    }

    if (!patientId && patientEmail) {
      const existingByEmail = await this.repository.findPatientByEmail(form.clinic_id, patientEmail);
      if (existingByEmail) {
        patientId = existingByEmail.id;
        currentSignaturePath = existingByEmail.signature_path;
      }
    }

    if (!patientId) {
      patientId = await this.repository.createQuickPatient({
        clinicId: form.clinic_id,
        fullName: patientName || "Paciente da anamnese",
        email: patientEmail,
      });
    }

    const signatureData = normalizeText(payload.signature_data);
    if (!signatureData) {
      throw new Error("Assinatura digital obrigatoria.");
    }

    const signaturePath = await createSignatureFilePath({
      clinicId: form.clinic_id,
      patientId,
      signatureData,
    });

    if (patientId && !currentSignaturePath) {
      await this.repository.setPatientSignaturePath(form.clinic_id, patientId, signaturePath);
    }

    const nowIso = new Date().toISOString();
    const response = await this.repository.createResponseFromPublicForm({
      formId: form.id,
      clinicId: form.clinic_id,
      patientId,
      patientName: patientName || null,
      patientEmail,
      status: "signed",
      signatureUrl: signaturePath,
      signedAt: nowIso,
      answers: normalizedAnswers,
    });

    return response;
  }

  async listResponsesByPatient(patientId: string) {
    const { clinicId, permissions } = await getClinicContext();
    assertPermission(permissions, "readPatients");
    return this.repository.listResponsesByPatient(clinicId, patientId);
  }

  async getResponseDetails(responseId: string) {
    const { clinicId, permissions } = await getClinicContext();
    assertPermission(permissions, "readPatients");
    const details = await this.repository.getResponseDetails(responseId, clinicId);
    if (!details) return null;

    let signatureUrl: string | null = null;
    if (details.response.signature_url) {
      const admin = supabaseAdmin();
      const { data } = await admin.storage
        .from(SIGNATURE_BUCKET)
        .createSignedUrl(details.response.signature_url, 600);
      signatureUrl = data?.signedUrl ?? null;
    }

    return {
      ...details,
      signature_signed_url: signatureUrl,
    };
  }
}

export const anamnesisService = new AnamnesisService();
