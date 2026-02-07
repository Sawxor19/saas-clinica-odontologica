import { supabaseServerClient } from "@/server/db/supabaseServer";

export async function listPayments(clinicId: string, start: string, end: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, method, paid_at")
    .eq("clinic_id", clinicId)
    .gte("paid_at", start)
    .lte("paid_at", end)
    .order("paid_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
