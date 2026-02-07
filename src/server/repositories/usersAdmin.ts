import { supabaseAdmin } from "@/server/db/supabaseAdmin";

export async function createAuthUser(email: string, password: string) {
  const admin = supabaseAdmin();
  const { data: usersList, error: listError } = await admin.auth.admin.listUsers();
  if (!listError) {
    const existing = usersList.users.find((user) => user.email === email);
    if (existing) return existing;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data?.user) {
    throw new Error(error?.message || "Failed to create user");
  }
  return data.user;
}

export async function insertProfileAdmin(input: {
  user_id: string;
  clinic_id: string;
  full_name: string;
  role: string;
  permissions?: Record<string, boolean> | null;
  phone?: string | null;
  cpf?: string | null;
  cro?: string | null;
  birth_date?: string | null;
  address?: string | null;
  cep?: string | null;
  photo_path?: string | null;
}) {
  const admin = supabaseAdmin();
  const { error } = await admin.from("profiles").upsert({
    user_id: input.user_id,
    clinic_id: input.clinic_id,
    full_name: input.full_name,
    role: input.role,
    permissions: input.permissions ?? null,
    phone: input.phone ?? null,
    cpf: input.cpf ?? null,
    cro: input.cro ?? null,
    birth_date: input.birth_date ?? null,
    address: input.address ?? null,
    cep: input.cep ?? null,
    photo_path: input.photo_path ?? null,
  }, { onConflict: "user_id" });
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteAuthUser(userId: string) {
  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(error.message);
  }
}
