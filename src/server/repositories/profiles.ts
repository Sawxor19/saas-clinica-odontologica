import { supabaseServerClient } from "@/server/db/supabaseServer";

export async function listDentists(clinicId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, role")
    .eq("clinic_id", clinicId)
    .in("role", ["dentist", "admin"])
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listProfiles(clinicId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, role, phone, cpf, cro, birth_date, address, cep, photo_path, created_at")
    .eq("clinic_id", clinicId)
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateProfileRole(
  clinicId: string,
  userId: string,
  role: string
) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("clinic_id", clinicId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function listProfilesByIds(clinicId: string, userIds: string[]) {
  if (userIds.length === 0) return [];
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .eq("clinic_id", clinicId)
    .in("user_id", userIds);

  if (error) throw new Error(error.message);
  return data ?? [];
}
