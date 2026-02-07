import { supabaseServerClient } from "@/server/db/supabaseServer";

export async function listRooms(clinicId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("id, name")
    .eq("clinic_id", clinicId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
