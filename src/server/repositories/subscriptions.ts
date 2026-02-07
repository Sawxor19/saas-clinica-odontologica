import { supabaseServerClient } from "@/server/db/supabaseServer";

export async function getSubscription(clinicId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, plan, status, current_period_end, stripe_subscription_id")
    .eq("clinic_id", clinicId)
    .single();
  if (error) throw new Error(error.message);
  return data;
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
