import { can, PermissionSet } from "@/server/rbac/permissions";
import { Role } from "@/types/schemas";

export function assertPermission(
  roleOrPermissions: Role | PermissionSet,
  permission: keyof PermissionSet
) {
  const permissions =
    typeof roleOrPermissions === "string"
      ? can(roleOrPermissions)
      : roleOrPermissions;
  if (!permissions[permission]) {
    throw new Error("Forbidden");
  }
}
