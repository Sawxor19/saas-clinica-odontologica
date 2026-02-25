import crypto from "crypto";
import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { getAppUrl } from "@/server/config/app-url";
import {
  AnamnesisQuestion,
  createAnamnesisLink,
  createAnamnesisTemplate,
  getAnamnesisLinkByToken,
  getAnamnesisTemplateById,
  listAnamnesisTemplates,
} from "@/server/repositories/anamnesis";

function buildQuestionId() {
  return `q_${crypto.randomBytes(6).toString("hex")}`;
}

function sanitizeQuestion(input: AnamnesisQuestion): AnamnesisQuestion {
  const label = String(input.label || "").trim();
  if (!label) {
    throw new Error("Pergunta sem titulo.");
  }

  const type = input.type;
  if (
    type !== "text" &&
    type !== "textarea" &&
    type !== "number" &&
    type !== "date" &&
    type !== "boolean" &&
    type !== "single_choice" &&
    type !== "multiple_choice"
  ) {
    throw new Error("Tipo de pergunta invalido.");
  }

  const options =
    type === "single_choice" || type === "multiple_choice"
      ? (input.options ?? [])
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      : undefined;

  if ((type === "single_choice" || type === "multiple_choice") && (!options || options.length < 2)) {
    throw new Error(`A pergunta "${label}" precisa de ao menos 2 opcoes.`);
  }

  return {
    id: input.id ? String(input.id) : buildQuestionId(),
    label,
    type,
    required: Boolean(input.required),
    placeholder: input.placeholder ? String(input.placeholder).trim() : undefined,
    options,
  };
}

function sanitizeQuestions(rawQuestions: unknown): AnamnesisQuestion[] {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw new Error("Adicione ao menos uma pergunta.");
  }
  return rawQuestions.map((question) => sanitizeQuestion(question as AnamnesisQuestion));
}

export async function getAnamnesisTemplates() {
  const { clinicId, permissions } = await getClinicContext();
  assertPermission(permissions, "readPatients");
  return listAnamnesisTemplates(clinicId);
}

export async function addAnamnesisTemplate(input: {
  title: string;
  description?: string | null;
  questions: unknown;
}) {
  const { clinicId, userId, permissions } = await getClinicContext();
  assertPermission(permissions, "writePatients");

  const title = String(input.title || "").trim();
  if (!title) {
    throw new Error("Informe o titulo da anamnese.");
  }

  const questions = sanitizeQuestions(input.questions);
  return createAnamnesisTemplate(clinicId, userId, {
    title,
    description: input.description ?? null,
    questions,
  });
}

export async function generateAnamnesisLink(input: {
  templateId: string;
  patientId?: string | null;
  expiresInHours?: number | null;
}) {
  const { clinicId, userId, permissions } = await getClinicContext();
  assertPermission(permissions, "writePatients");

  const templateId = String(input.templateId || "");
  if (!templateId) {
    throw new Error("Selecione uma anamnese.");
  }

  const template = await getAnamnesisTemplateById(clinicId, templateId);
  if (!template || !template.is_active) {
    throw new Error("Anamnese nao encontrada ou inativa.");
  }

  const token = crypto.randomBytes(18).toString("hex");
  const expiresInHours = Math.max(1, Math.min(168, Number(input.expiresInHours ?? 72)));
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

  await createAnamnesisLink({
    clinicId,
    templateId,
    patientId: input.patientId ?? null,
    token,
    expiresAt,
    createdBy: userId,
  });

  const appUrl = getAppUrl();
  return `${appUrl}/anamnese/${token}`;
}

export async function getPublicAnamnesisByToken(token: string) {
  const trimmedToken = String(token || "").trim();
  if (!trimmedToken) return null;

  const link = await getAnamnesisLinkByToken(trimmedToken);
  if (!link) return null;
  if (link.used_at) return null;
  if (new Date(link.expires_at).getTime() < Date.now()) return null;
  if (!link.template || !link.template.is_active) return null;

  return link;
}
