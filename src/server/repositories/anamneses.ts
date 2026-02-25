import { supabaseServerClient } from "@/server/db/supabaseServer";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export type AnamnesisFieldType =
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "yes_no"
  | "number";

export type AnamnesisFormStatus = "draft" | "published" | "archived";

export type AnamnesisFieldInput = {
  id?: string;
  label: string;
  help_text?: string | null;
  type: AnamnesisFieldType;
  required: boolean;
  order_index: number;
  options?: string[] | null;
  validation?: Record<string, unknown> | null;
};

export type AnamnesisFormRecord = {
  id: string;
  clinic_id: string;
  title: string;
  description: string | null;
  status: AnamnesisFormStatus;
  public_slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type AnamnesisFieldRecord = {
  id: string;
  form_id: string;
  label: string;
  help_text: string | null;
  type: AnamnesisFieldType;
  required: boolean;
  order_index: number;
  options: string[] | null;
  validation: Record<string, unknown> | null;
  created_at: string;
};

export type AnamnesisResponseRecord = {
  id: string;
  form_id: string;
  clinic_id: string;
  patient_id: string | null;
  patient_name: string | null;
  patient_email: string | null;
  status: "submitted" | "signed";
  submitted_at: string;
  signature_url: string | null;
  signed_at: string | null;
};

function sanitizeOptions(options: unknown): string[] | null {
  if (!Array.isArray(options)) return null;
  const normalized = options
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
  return normalized.length > 0 ? normalized : null;
}

function asFieldRecord(value: unknown): AnamnesisFieldRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id ?? ""),
    form_id: String(row.form_id ?? ""),
    label: String(row.label ?? ""),
    help_text: row.help_text ? String(row.help_text) : null,
    type: (row.type as AnamnesisFieldType) ?? "text",
    required: Boolean(row.required),
    order_index: Number(row.order_index ?? 0),
    options: sanitizeOptions(row.options),
    validation:
      row.validation && typeof row.validation === "object"
        ? (row.validation as Record<string, unknown>)
        : null,
    created_at: String(row.created_at ?? ""),
  };
}

function asFormRecord(value: unknown): AnamnesisFormRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id ?? ""),
    clinic_id: String(row.clinic_id ?? ""),
    title: String(row.title ?? ""),
    description: row.description ? String(row.description) : null,
    status: (row.status as AnamnesisFormStatus) ?? "draft",
    public_slug: String(row.public_slug ?? ""),
    created_by: String(row.created_by ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function asResponseRecord(value: unknown): AnamnesisResponseRecord {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id ?? ""),
    form_id: String(row.form_id ?? ""),
    clinic_id: String(row.clinic_id ?? ""),
    patient_id: row.patient_id ? String(row.patient_id) : null,
    patient_name: row.patient_name ? String(row.patient_name) : null,
    patient_email: row.patient_email ? String(row.patient_email) : null,
    status: (row.status as "submitted" | "signed") ?? "submitted",
    submitted_at: String(row.submitted_at ?? ""),
    signature_url: row.signature_url ? String(row.signature_url) : null,
    signed_at: row.signed_at ? String(row.signed_at) : null,
  };
}

type CreateResponseInput = {
  formId: string;
  clinicId: string;
  patientId: string | null;
  patientName: string | null;
  patientEmail: string | null;
  status: "submitted" | "signed";
  signatureUrl: string | null;
  signedAt: string | null;
  answers: Array<{
    fieldId: string;
    answer: unknown;
  }>;
};

export class AnamnesisRepository {
  async listFormsByClinic(clinicId: string) {
    const supabase = await supabaseServerClient();
    const { data, error } = await supabase
      .from("anamnesis_forms")
      .select("id, clinic_id, title, description, status, public_slug, created_by, created_at, updated_at")
      .eq("clinic_id", clinicId)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(asFormRecord);
  }

  async getForm(formId: string, clinicId: string) {
    const supabase = await supabaseServerClient();
    const { data: form, error: formError } = await supabase
      .from("anamnesis_forms")
      .select("id, clinic_id, title, description, status, public_slug, created_by, created_at, updated_at")
      .eq("id", formId)
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (formError) throw new Error(formError.message);
    if (!form) return null;

    const { data: fields, error: fieldsError } = await supabase
      .from("anamnesis_fields")
      .select("id, form_id, label, help_text, type, required, order_index, options, validation, created_at")
      .eq("form_id", formId)
      .order("order_index", { ascending: true });

    if (fieldsError) throw new Error(fieldsError.message);

    return {
      ...asFormRecord(form),
      fields: (fields ?? []).map(asFieldRecord),
    };
  }

  async createForm(input: {
    clinicId: string;
    createdBy: string;
    title: string;
    publicSlug: string;
  }) {
    const supabase = await supabaseServerClient();
    const { data, error } = await supabase
      .from("anamnesis_forms")
      .insert({
        clinic_id: input.clinicId,
        title: input.title,
        public_slug: input.publicSlug,
        created_by: input.createdBy,
      })
      .select("id, clinic_id, title, description, status, public_slug, created_by, created_at, updated_at")
      .single();

    if (error) throw new Error(error.message);
    return asFormRecord(data);
  }

  async updateForm(
    formId: string,
    clinicId: string,
    payload: {
      title?: string;
      description?: string | null;
      status?: AnamnesisFormStatus;
    }
  ) {
    const supabase = await supabaseServerClient();
    const { data, error } = await supabase
      .from("anamnesis_forms")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", formId)
      .eq("clinic_id", clinicId)
      .select("id, clinic_id, title, description, status, public_slug, created_by, created_at, updated_at")
      .single();

    if (error) throw new Error(error.message);
    return asFormRecord(data);
  }

  async deleteForm(formId: string, clinicId: string) {
    const supabase = await supabaseServerClient();
    const { error } = await supabase
      .from("anamnesis_forms")
      .delete()
      .eq("id", formId)
      .eq("clinic_id", clinicId);
    if (error) throw new Error(error.message);
  }

  async upsertFields(formId: string, clinicId: string, fields: AnamnesisFieldInput[]) {
    const supabase = await supabaseServerClient();
    const { data: form, error: formError } = await supabase
      .from("anamnesis_forms")
      .select("id")
      .eq("id", formId)
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (formError) throw new Error(formError.message);
    if (!form) {
      throw new Error("Anamnese nao encontrada");
    }

    const { error: deleteError } = await supabase
      .from("anamnesis_fields")
      .delete()
      .eq("form_id", formId);
    if (deleteError) throw new Error(deleteError.message);

    if (fields.length === 0) {
      return [];
    }

    const payload = fields.map((field, index) => ({
      form_id: formId,
      label: field.label,
      help_text: field.help_text ?? null,
      type: field.type,
      required: field.required,
      order_index: Number.isFinite(field.order_index) ? field.order_index : index,
      options: sanitizeOptions(field.options) ?? null,
      validation:
        field.validation && typeof field.validation === "object"
          ? field.validation
          : null,
    }));

    const { data, error } = await supabase
      .from("anamnesis_fields")
      .insert(payload)
      .select("id, form_id, label, help_text, type, required, order_index, options, validation, created_at");

    if (error) throw new Error(error.message);
    return (data ?? [])
      .map(asFieldRecord)
      .sort((a, b) => a.order_index - b.order_index);
  }

  async getFormByPublicSlug(slug: string) {
    const admin = supabaseAdmin();
    const { data: form, error: formError } = await admin
      .from("anamnesis_forms")
      .select("id, clinic_id, title, description, status, public_slug, created_by, created_at, updated_at")
      .eq("public_slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (formError) throw new Error(formError.message);
    if (!form) return null;

    const { data: fields, error: fieldsError } = await admin
      .from("anamnesis_fields")
      .select("id, form_id, label, help_text, type, required, order_index, options, validation, created_at")
      .eq("form_id", form.id)
      .order("order_index", { ascending: true });

    if (fieldsError) throw new Error(fieldsError.message);

    return {
      ...asFormRecord(form),
      fields: (fields ?? []).map(asFieldRecord),
    };
  }

  async findPatientById(clinicId: string, patientId: string) {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("patients")
      .select("id, signature_path")
      .eq("clinic_id", clinicId)
      .eq("id", patientId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data
      ? {
          id: String(data.id),
          signature_path: data.signature_path ? String(data.signature_path) : null,
        }
      : null;
  }

  async findPatientByEmail(clinicId: string, patientEmail: string) {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("patients")
      .select("id, full_name, email, signature_path")
      .eq("clinic_id", clinicId)
      .eq("email", patientEmail)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data
      ? {
          id: String(data.id),
          full_name: data.full_name ? String(data.full_name) : null,
          email: data.email ? String(data.email) : null,
          signature_path: data.signature_path ? String(data.signature_path) : null,
        }
      : null;
  }

  async createQuickPatient(input: {
    clinicId: string;
    fullName: string;
    email: string | null;
  }) {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("patients")
      .insert({
        clinic_id: input.clinicId,
        full_name: input.fullName,
        email: input.email,
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return String(data.id);
  }

  async setPatientSignaturePath(
    clinicId: string,
    patientId: string,
    signaturePath: string
  ) {
    const admin = supabaseAdmin();
    const { error } = await admin
      .from("patients")
      .update({ signature_path: signaturePath })
      .eq("clinic_id", clinicId)
      .eq("id", patientId);
    if (error) throw new Error(error.message);
  }

  async createResponseFromPublicForm(input: CreateResponseInput) {
    const admin = supabaseAdmin();
    const { data: response, error: responseError } = await admin
      .from("anamnesis_responses")
      .insert({
        form_id: input.formId,
        clinic_id: input.clinicId,
        patient_id: input.patientId,
        patient_name: input.patientName,
        patient_email: input.patientEmail,
        status: input.status,
        signature_url: input.signatureUrl,
        signed_at: input.signedAt,
      })
      .select("id, form_id, clinic_id, patient_id, patient_name, patient_email, status, submitted_at, signature_url, signed_at")
      .single();

    if (responseError) throw new Error(responseError.message);
    const responseId = String(response.id);

    if (input.answers.length > 0) {
      const answersPayload = input.answers.map((answer) => ({
        response_id: responseId,
        field_id: answer.fieldId,
        answer: answer.answer ?? null,
      }));
      const { error: answersError } = await admin
        .from("anamnesis_answers")
        .insert(answersPayload);

      if (answersError) {
        await admin.from("anamnesis_responses").delete().eq("id", responseId);
        throw new Error(answersError.message);
      }
    }

    return asResponseRecord(response);
  }

  async listResponsesByPatient(clinicId: string, patientId: string) {
    const supabase = await supabaseServerClient();
    const { data: responses, error: responsesError } = await supabase
      .from("anamnesis_responses")
      .select("id, form_id, clinic_id, patient_id, patient_name, patient_email, status, submitted_at, signature_url, signed_at")
      .eq("clinic_id", clinicId)
      .eq("patient_id", patientId)
      .order("submitted_at", { ascending: false });

    if (responsesError) throw new Error(responsesError.message);
    const responseList = (responses ?? []).map(asResponseRecord);
    const formIds = Array.from(new Set(responseList.map((item) => item.form_id)));

    let formMap = new Map<string, Pick<AnamnesisFormRecord, "id" | "title" | "public_slug">>();
    if (formIds.length > 0) {
      const { data: forms, error: formsError } = await supabase
        .from("anamnesis_forms")
        .select("id, title, public_slug")
        .eq("clinic_id", clinicId)
        .in("id", formIds);
      if (formsError) throw new Error(formsError.message);
      formMap = new Map(
        (forms ?? []).map((item) => [
          String(item.id),
          {
            id: String(item.id),
            title: String(item.title ?? ""),
            public_slug: String(item.public_slug ?? ""),
          },
        ])
      );
    }

    return responseList.map((item) => ({
      ...item,
      form_title: formMap.get(item.form_id)?.title ?? "Anamnese",
      form_public_slug: formMap.get(item.form_id)?.public_slug ?? "",
    }));
  }

  async getResponseDetails(responseId: string, clinicId: string) {
    const supabase = await supabaseServerClient();
    const { data: response, error: responseError } = await supabase
      .from("anamnesis_responses")
      .select("id, form_id, clinic_id, patient_id, patient_name, patient_email, status, submitted_at, signature_url, signed_at")
      .eq("id", responseId)
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (responseError) throw new Error(responseError.message);
    if (!response) return null;

    const { data: form, error: formError } = await supabase
      .from("anamnesis_forms")
      .select("id, clinic_id, title, description, status, public_slug, created_by, created_at, updated_at")
      .eq("id", response.form_id)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (formError) throw new Error(formError.message);
    if (!form) return null;

    const { data: fields, error: fieldsError } = await supabase
      .from("anamnesis_fields")
      .select("id, form_id, label, help_text, type, required, order_index, options, validation, created_at")
      .eq("form_id", response.form_id)
      .order("order_index", { ascending: true });
    if (fieldsError) throw new Error(fieldsError.message);

    const { data: answers, error: answersError } = await supabase
      .from("anamnesis_answers")
      .select("field_id, answer")
      .eq("response_id", response.id);
    if (answersError) throw new Error(answersError.message);

    const answerMap = new Map(
      (answers ?? []).map((item) => [String(item.field_id), item.answer])
    );

    return {
      response: asResponseRecord(response),
      form: asFormRecord(form),
      fields: (fields ?? []).map((item) => {
        const field = asFieldRecord(item);
        return {
          ...field,
          answer: answerMap.get(field.id) ?? null,
        };
      }),
    };
  }
}
