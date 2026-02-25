import { supabaseServerClient } from "@/server/db/supabaseServer";
import { AppointmentInput } from "@/types/schemas";

export async function listAppointments(clinicId: string, start?: string, end?: string) {
  const supabase = await supabaseServerClient();
  let request = supabase
    .from("appointments")
    .select(
      "id, patient_id, dentist_id, room_id, procedure_id, charge_amount, starts_at, ends_at, status, notes, payment_status, payment_method, paid_at"
    )
    .eq("clinic_id", clinicId)
    .order("starts_at", { ascending: true });

  if (start) request = request.gte("starts_at", start);
  if (end) request = request.lte("ends_at", end);

  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data;
}

export async function createAppointment(clinicId: string, input: AppointmentInput) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      clinic_id: clinicId,
      patient_id: input.patient_id,
      dentist_id: input.dentist_id,
      procedure_id: input.procedure_id,
      charge_amount: input.charge_amount,
      room_id: input.room_id || null,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      status: input.status,
      notes: input.notes || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listAppointmentsByPatient(clinicId: string, patientId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, procedure_id, charge_amount, starts_at, ends_at, status, payment_status, payment_method, paid_at"
    )
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .order("starts_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAppointmentPayments(clinicId: string, start: string, end: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, patient_id, procedure_id, charge_amount, payment_method, paid_at")
    .eq("clinic_id", clinicId)
    .eq("payment_status", "paid")
    .gte("paid_at", start)
    .lte("paid_at", end)
    .order("paid_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCompletedAppointmentsByRange(
  clinicId: string,
  start: string,
  end: string
) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, procedure_id")
    .eq("clinic_id", clinicId)
    .eq("status", "completed")
    .gte("starts_at", start)
    .lte("starts_at", end);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateAppointmentStatus(
  clinicId: string,
  appointmentId: string,
  input: {
    status: string;
    payment_status?: string | null;
    payment_method?: string | null;
    paid_at?: string | null;
  }
) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("appointments")
    .update({
      status: input.status,
      payment_status: input.payment_status ?? null,
      payment_method: input.payment_method ?? null,
      paid_at: input.paid_at ?? null,
    })
    .eq("clinic_id", clinicId)
    .eq("id", appointmentId);

  if (error) throw new Error(error.message);
}

export async function listPaidAppointmentsByRange(
  clinicId: string,
  start: string,
  end: string
) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, procedure_id, dentist_id, charge_amount, paid_at")
    .eq("clinic_id", clinicId)
    .eq("payment_status", "paid")
    .gte("paid_at", start)
    .lte("paid_at", end);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listUpcomingAppointments(
  clinicId: string,
  start: string,
  end: string
) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, patient_id, starts_at, status")
    .eq("clinic_id", clinicId)
    .gte("starts_at", start)
    .lte("starts_at", end)
    .in("status", ["scheduled", "confirmed"]);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCompletedAppointmentsForFollowUp(
  clinicId: string,
  start: string,
  end: string
) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, patient_id, ends_at")
    .eq("clinic_id", clinicId)
    .eq("status", "completed")
    .gte("ends_at", start)
    .lte("ends_at", end);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function hasConflictingAppointment(
  clinicId: string,
  dentistId: string,
  startsAt: string,
  endsAt: string,
  excludeAppointmentId?: string
) {
  const supabase = await supabaseServerClient();
  let request = supabase
    .from("appointments")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("dentist_id", dentistId)
    .lt("starts_at", endsAt)
    .gt("ends_at", startsAt)
    .limit(1);

  if (excludeAppointmentId) {
    request = request.neq("id", excludeAppointmentId);
  }

  const { data, error } = await request;

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export async function getAppointmentById(clinicId: string, appointmentId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, dentist_id, starts_at, ends_at")
    .eq("clinic_id", clinicId)
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateAppointmentDateTime(
  clinicId: string,
  appointmentId: string,
  input: { starts_at: string; ends_at: string }
) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("appointments")
    .update({
      starts_at: input.starts_at,
      ends_at: input.ends_at,
    })
    .eq("clinic_id", clinicId)
    .eq("id", appointmentId);

  if (error) throw new Error(error.message);
}

export async function deleteAppointment(clinicId: string, appointmentId: string) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("id", appointmentId);
  if (error) throw new Error(error.message);
}
