import { supabaseServerClient } from "@/server/db/supabaseServer";

export async function listProcedures(clinicId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("procedures")
    .select("id, name, price")
    .eq("clinic_id", clinicId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listProceduresByIds(clinicId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("procedures")
    .select("id, name, price")
    .eq("clinic_id", clinicId)
    .in("id", ids);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listProcedureMaterials(clinicId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("procedure_materials")
    .select("procedure_id, material_id, quantity")
    .eq("clinic_id", clinicId);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createProcedure(clinicId: string, input: {
  name: string;
  price: number;
}) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("procedures")
    .insert({
      clinic_id: clinicId,
      name: input.name,
      price: input.price,
      active: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProcedure(
  clinicId: string,
  procedureId: string,
  input: { name: string; price: number }
) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("procedures")
    .update({ name: input.name, price: input.price })
    .eq("clinic_id", clinicId)
    .eq("id", procedureId);

  if (error) throw new Error(error.message);
}

export async function deleteProcedure(clinicId: string, procedureId: string) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("procedures")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("id", procedureId);

  if (error) throw new Error(error.message);
}

export async function attachProcedureMaterial(clinicId: string, input: {
  procedure_id: string;
  material_id: string;
  quantity: number;
}) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("procedure_materials")
    .insert({
      clinic_id: clinicId,
      procedure_id: input.procedure_id,
      material_id: input.material_id,
      quantity: input.quantity,
    });

  if (error) throw new Error(error.message);
}

export async function clearProcedureMaterials(clinicId: string, procedureId: string) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("procedure_materials")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("procedure_id", procedureId);

  if (error) throw new Error(error.message);
}
