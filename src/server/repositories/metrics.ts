import { supabaseServerClient } from "@/server/db/supabaseServer";

export async function countAppointments(
  clinicId: string,
  start: string,
  end: string,
  status?: string
) {
  const supabase = await supabaseServerClient();
  let query = supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .gte("starts_at", start)
    .lte("starts_at", end);

  if (status) {
    query = query.eq("status", status);
  }

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function sumPayments(clinicId: string, start: string, end: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("amount")
    .eq("clinic_id", clinicId)
    .gte("paid_at", start)
    .lte("paid_at", end);

  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
}

export async function sumAppointmentPayments(
  clinicId: string,
  start: string,
  end: string
) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("charge_amount")
    .eq("clinic_id", clinicId)
    .eq("payment_status", "paid")
    .gte("paid_at", start)
    .lte("paid_at", end);

  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum, row) => sum + Number(row.charge_amount), 0);
}

export async function countBudgetsByStatus(
  clinicId: string,
  status: string,
  start?: string,
  end?: string
) {
  const supabase = await supabaseServerClient();
  let query = supabase
    .from("budgets")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .eq("status", status);

  if (start) query = query.gte("created_at", start);
  if (end) query = query.lte("created_at", end);

  const { count, error } = await query;

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countBudgets(clinicId: string, start?: string, end?: string) {
  const supabase = await supabaseServerClient();
  let query = supabase
    .from("budgets")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId);

  if (start) query = query.gte("created_at", start);
  if (end) query = query.lte("created_at", end);

  const { count, error } = await query;

  if (error) throw new Error(error.message);
  return count ?? 0;
}
