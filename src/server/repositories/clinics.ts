import { supabaseServerClient } from "@/server/db/supabaseServer";

export async function getClinicById(clinicId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("clinics")
    .select("id, name, subscription_status, current_period_end, timezone")
    .eq("id", clinicId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getClinicTimezone(clinicId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("clinics")
    .select("timezone")
    .eq("id", clinicId)
    .single();
  if (error) throw new Error(error.message);
  return data?.timezone ?? null;
}
