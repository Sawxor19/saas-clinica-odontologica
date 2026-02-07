import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { auditLog } from "@/server/audit/auditLog";
import { listProfiles, updateProfileRole } from "@/server/repositories/profiles";
import { createAuthUser, deleteAuthUser, insertProfileAdmin } from "../repositories/usersAdmin";
import { SupabaseStorageProvider } from "@/server/storage/supabase";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { PermissionSet } from "@/server/rbac/permissions";

const storage = new SupabaseStorageProvider();

export async function getUsers() {
  const { clinicId, userId } = await getClinicContext();
  const users = await listProfiles(clinicId);
  const usersWithPhoto = await Promise.all(
    users.map(async (user) => ({
      ...user,
      photo_url: user.photo_path ? await storage.getSignedUrl(user.photo_path) : null,
    }))
  );
  await auditLog({
    clinicId,
    userId,
    action: "users.list",
    entity: "profile",
  });
  return usersWithPhoto;
}

export async function changeUserRole(userId: string, roleToSet: string) {
  const { clinicId, permissions, userId: actorId } = await getClinicContext();
  assertPermission(permissions, "manageUsers");
  await updateProfileRole(clinicId, userId, roleToSet);
  await auditLog({
    clinicId,
    userId: actorId,
    action: "users.role",
    entity: "profile",
    entityId: userId,
    metadata: { role: roleToSet },
  });
}

export async function createStaffMember(input: {
  full_name: string;
  email: string;
  password: string;
  role: string;
  permissions?: PermissionSet;
  phone?: string;
  cpf?: string;
  cro?: string;
  birth_date?: string;
  address?: string;
  cep?: string;
  photo?: File | null;
}) {
  const { clinicId, permissions, userId } = await getClinicContext();
  assertPermission(permissions, "manageUsers");

  const user = await createAuthUser(input.email, input.password);
  let photoPath: string | null = null;
  if (input.photo) {
    const path = `${clinicId}/staff/${user.id}/${Date.now()}-${input.photo.name}`;
    const upload = await storage.upload(input.photo, path);
    photoPath = upload.path;
  }

  await insertProfileAdmin({
    user_id: user.id,
    clinic_id: clinicId,
    full_name: input.full_name,
    role: input.role,
    permissions: input.permissions ?? null,
    phone: input.phone ?? null,
    cpf: input.cpf ?? null,
    cro: input.cro ?? null,
    birth_date: input.birth_date ?? null,
    address: input.address ?? null,
    cep: input.cep ?? null,
    photo_path: photoPath,
  });

  await auditLog({
    clinicId,
    userId,
    action: "users.create",
    entity: "profile",
    entityId: user.id,
    metadata: { role: input.role },
  });
}

export async function deleteStaffMember(targetUserId: string) {
  const { clinicId, permissions, userId: actorId } = await getClinicContext();
  assertPermission(permissions, "manageUsers");

  if (targetUserId === actorId) {
    throw new Error("Cannot remove own user");
  }

  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("clinic_id")
    .eq("user_id", targetUserId)
    .single();

  if (!profile || profile.clinic_id !== clinicId) {
    throw new Error("User not found");
  }

  await deleteAuthUser(targetUserId);

  await auditLog({
    clinicId,
    userId: actorId,
    action: "users.delete",
    entity: "profile",
    entityId: targetUserId,
  });
}
