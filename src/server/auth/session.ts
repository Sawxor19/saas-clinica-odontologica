import { supabaseServerClient } from "@/server/db/supabaseServer";

export async function getSessionUser() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  return user;
}
