import { Role } from "@/types/schemas";

export type PermissionSet = {
  manageUsers: boolean;
  manageBilling: boolean;
  viewAudit: boolean;
  readPatients: boolean;
  writePatients: boolean;
  readSchedule: boolean;
  writeSchedule: boolean;
  readClinical: boolean;
  writeClinicalNotes: boolean;
  writePrescriptions: boolean;
  readProcedures: boolean;
  writeBudgets: boolean;
  readFinance: boolean;
  writePayments: boolean;
  manageInventory: boolean;
  manageProcedures: boolean;
};

const rolePermissions: Record<Role, PermissionSet> = {
  admin: {
    manageUsers: true,
    manageBilling: true,
    viewAudit: true,
    readPatients: true,
    writePatients: true,
    readSchedule: true,
    writeSchedule: true,
    readClinical: true,
    writeClinicalNotes: true,
    writePrescriptions: true,
    readProcedures: true,
    writeBudgets: true,
    readFinance: true,
    writePayments: true,
    manageInventory: true,
    manageProcedures: true,
  },
  dentist: {
    manageUsers: false,
    manageBilling: false,
    viewAudit: false,
    readPatients: true,
    writePatients: false,
    readSchedule: true,
    writeSchedule: true,
    readClinical: true,
    writeClinicalNotes: true,
    writePrescriptions: true,
    readProcedures: true,
    writeBudgets: true,
    readFinance: false,
    writePayments: false,
    manageInventory: false,
    manageProcedures: true,
  },
  assistant: {
    manageUsers: false,
    manageBilling: false,
    viewAudit: false,
    readPatients: true,
    writePatients: false,
    readSchedule: true,
    writeSchedule: false,
    readClinical: true,
    writeClinicalNotes: false,
    writePrescriptions: false,
    readProcedures: true,
    writeBudgets: false,
    readFinance: false,
    writePayments: false,
    manageInventory: true,
    manageProcedures: false,
  },
  receptionist: {
    manageUsers: false,
    manageBilling: false,
    viewAudit: false,
    readPatients: true,
    writePatients: true,
    readSchedule: true,
    writeSchedule: true,
    readClinical: false,
    writeClinicalNotes: false,
    writePrescriptions: false,
    readProcedures: true,
    writeBudgets: false,
    readFinance: true,
    writePayments: true,
    manageInventory: true,
    manageProcedures: false,
  },
};

export function can(role: Role) {
  return rolePermissions[role];
}

export function buildPermissions(role: Role, overrides?: Partial<PermissionSet> | null) {
  if (!overrides) return rolePermissions[role];
  return {
    ...rolePermissions[role],
    ...overrides,
  };
}
