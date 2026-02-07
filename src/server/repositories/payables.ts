import { supabaseServerClient } from "@/server/db/supabaseServer";

export async function listPayables(clinicId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("payables")
    .select("id, name, amount, due_date, payment_method, installments, is_paid")
    .eq("clinic_id", clinicId)
    .order("due_date", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPayable(
  clinicId: string,
  input: {
    name: string;
    amount: number;
    due_date: string;
    payment_method: string;
    installments?: number | null;
    is_paid: boolean;
  }
) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("payables")
    .insert({
      clinic_id: clinicId,
      name: input.name,
      amount: input.amount,
      due_date: input.due_date,
      payment_method: input.payment_method || null,
      installments: input.installments ?? null,
      is_paid: input.is_paid,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updatePayable(
  clinicId: string,
  payableId: string,
  input: {
    name: string;
    amount: number;
    due_date: string;
    payment_method: string;
    installments?: number | null;
    is_paid: boolean;
  }
) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("payables")
    .update({
      name: input.name,
      amount: input.amount,
      due_date: input.due_date,
      payment_method: input.payment_method || null,
      installments: input.installments ?? null,
      is_paid: input.is_paid,
    })
    .eq("clinic_id", clinicId)
    .eq("id", payableId);

  if (error) throw new Error(error.message);
}

export async function deletePayable(clinicId: string, payableId: string) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("payables")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("id", payableId);

  if (error) throw new Error(error.message);
}