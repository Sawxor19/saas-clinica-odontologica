import { supabaseAdmin } from "@/server/db/supabaseAdmin";

const DEFAULT_BUCKET = "clinic-attachments";
const REMOVE_BATCH_SIZE = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export async function removeStorageFiles(
  paths: Array<string | null | undefined>,
  bucket = DEFAULT_BUCKET
) {
  const uniquePaths = Array.from(
    new Set(
      paths
        .map((path) => String(path ?? "").trim())
        .filter((path) => path.length > 0)
    )
  );

  if (uniquePaths.length === 0) return;

  const admin = supabaseAdmin();
  const batches = chunk(uniquePaths, REMOVE_BATCH_SIZE);

  for (const batch of batches) {
    const { error } = await admin.storage.from(bucket).remove(batch);
    if (error) {
      throw new Error(`Falha ao remover arquivos do storage: ${error.message}`);
    }
  }
}
