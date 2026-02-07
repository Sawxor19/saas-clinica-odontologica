import { z } from "zod";

export const roleSchema = z.enum([
  "admin",
  "dentist",
  "assistant",
  "receptionist",
]);

export const clinicSchema = z.object({
  name: z.string().min(2),
});

export const profileSchema = z.object({
  full_name: z.string().min(2),
  role: roleSchema,
});

export const patientSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(8).optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  cpf: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  cep: z.string().optional().or(z.literal("")),
  emergency_contact: z.string().optional().or(z.literal("")),
  allergies: z.string().optional().or(z.literal("")),
  chronic_conditions: z.string().optional().or(z.literal("")),
  medications: z.string().optional().or(z.literal("")),
  alerts: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "intake_pending"]).optional(),
  dentist_id: z.string().uuid().optional().or(z.literal("")),
});

export const appointmentSchema = z.object({
  patient_id: z.string().uuid(),
  dentist_id: z.string().uuid(),
  procedure_id: z.string().uuid(),
  room_id: z.string().uuid().optional().or(z.literal("")),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  status: z.enum([
    "scheduled",
    "confirmed",
    "arrived",
    "in_progress",
    "completed",
    "missed",
    "cancelled",
  ]),
  charge_amount: z.number().min(0),
  notes: z.string().optional().or(z.literal("")),
});

export const budgetSchema = z.object({
  patient_id: z.string().uuid(),
  discount: z.number().min(0).max(100).optional(),
  notes: z.string().optional().or(z.literal("")),
});

export const budgetItemSchema = z.object({
  procedure_id: z.string().uuid(),
  quantity: z.number().min(1),
  unit_price: z.number().min(0),
});

export const paymentSchema = z.object({
  patient_id: z.string().uuid(),
  amount: z.number().min(0),
  method: z.enum(["cash", "card", "pix", "transfer"]),
  paid_at: z.string().datetime(),
  notes: z.string().optional().or(z.literal("")),
});

export type Role = z.infer<typeof roleSchema>;
export type PatientInput = z.infer<typeof patientSchema>;
export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type BudgetItemInput = z.infer<typeof budgetItemSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
