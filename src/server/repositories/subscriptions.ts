import { supabaseServerClient } from "@/server/db/supabaseServer";

export async function getSubscription(clinicId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, plan, status, current_period_end, stripe_subscription_id")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return data;

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("subscription_status, current_period_end")
    .eq("id", clinicId)
    .maybeSingle();

  if (clinicError) throw new Error(clinicError.message);

  return {
    id: null,
    plan: "monthly",
    status: clinic?.subscription_status ?? "inactive",
    current_period_end: clinic?.current_period_end ?? null,
    stripe_subscription_id: null,
  };
}

export async function listPaymentHistory(clinicId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("payments_history")
    .select("id, amount, stripe_invoice_id, paid_at")
    .eq("clinic_id", clinicId)
    .order("paid_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
