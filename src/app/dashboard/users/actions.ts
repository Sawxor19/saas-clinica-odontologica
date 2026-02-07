"use server";

import { revalidatePath } from "next/cache";
import { changeUserRole, createStaffMember, deleteStaffMember } from "@/server/services/users";
import { PermissionSet } from "@/server/rbac/permissions";

const PERMISSION_KEYS = [
  "manageUsers",
  "manageBilling",
  "viewAudit",
  "readPatients",
  "writePatients",
  "readSchedule",
  "writeSchedule",
  "readClinical",
  "writeClinicalNotes",
  "writePrescriptions",
  "readProcedures",
  "writeBudgets",
  "readFinance",
  "writePayments",
  "manageInventory",
  "manageProcedures",
] as const;

export async function updateUserRoleAction(formData: FormData) {
  const userId = String(formData.get("user_id") || "");
  const role = String(formData.get("role") || "");
  if (!userId || !role) return;

  await changeUserRole(userId, role);
  revalidatePath("/dashboard/users");
}

export async function createStaffAction(formData: FormData) {
  const full_name = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "");
  const phone = String(formData.get("phone") || "");
  const cpf = String(formData.get("cpf") || "");
  const cro = String(formData.get("cro") || "");
  const birth_date = String(formData.get("birth_date") || "");
  const address = String(formData.get("address") || "");
  const cep = String(formData.get("cep") || "");
  const photo = formData.get("photo") as File | null;
  const permissions = PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = formData.get(`perm_${key}`) === "on";
    return acc;
  }, {} as PermissionSet);

  if (!full_name || !email || !password || !role) return;

  await createStaffMember({
    full_name,
    email,
    password,
    role,
    phone,
    cpf,
    cro,
    birth_date,
    address,
    cep,
    photo,
    permissions,
  });
  revalidatePath("/dashboard/users");
}

export async function removeUserAction(formData: FormData) {
  const userId = String(formData.get("user_id") || "");
  if (!userId) return;
  await deleteStaffMember(userId);
  revalidatePath("/dashboard/users");
}
