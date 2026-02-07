import { supabaseServerClient } from "@/server/db/supabaseServer";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { logger } from "@/lib/logger";

type AuditLogInput = {
  clinicId: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function auditLog(input: AuditLogInput) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase.from("audit_logs").insert({
    clinic_id: input.clinicId,
    user_id: input.userId,
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? null,
  });

  if (error) {
    logger.warn("Audit log failed", { error: error.message });
  }
}

export async function auditLogAdmin(input: AuditLogInput) {
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("audit_logs").insert({
    clinic_id: input.clinicId,
    user_id: input.userId,
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? null,
  });

  if (error) {
    logger.warn("Audit log failed", { error: error.message });
  }
}
