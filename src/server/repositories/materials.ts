import { supabaseServerClient } from "@/server/db/supabaseServer";

export async function listMaterials(clinicId: string) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("materials")
    .select("id, name, unit, current_stock, min_stock")
    .eq("clinic_id", clinicId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createMaterial(clinicId: string, input: {
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
}) {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("materials")
    .insert({
      clinic_id: clinicId,
      name: input.name,
      unit: input.unit,
      current_stock: input.current_stock,
      min_stock: input.min_stock,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateMaterial(
  clinicId: string,
  materialId: string,
  input: { name: string; unit: string; current_stock: number; min_stock: number }
) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("materials")
    .update({
      name: input.name,
      unit: input.unit,
      current_stock: input.current_stock,
      min_stock: input.min_stock,
    })
    .eq("clinic_id", clinicId)
    .eq("id", materialId);
  if (error) throw new Error(error.message);
}

export async function deleteMaterial(clinicId: string, materialId: string) {
  const supabase = await supabaseServerClient();
  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("id", materialId);
  if (error) throw new Error(error.message);
}
