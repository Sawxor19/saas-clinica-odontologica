import { supabaseServerClient } from "@/server/db/supabaseServer";

export async function isFeatureEnabled(clinicId: string, key: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("clinic_features")
    .select("enabled")
    .eq("clinic_id", clinicId)
    .eq("feature_key", key)
    .single();

  if (error || !data) return false;
  return data.enabled;
}
