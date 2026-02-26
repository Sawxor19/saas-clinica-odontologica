import { StorageProvider, StorageUploadResult } from "@/server/storage/provider";
import { supabaseServerClient } from "@/server/db/supabaseServer";

const BUCKET = "clinic-attachments";

export class SupabaseStorageProvider implements StorageProvider {
  async upload(file: File, path: string): Promise<StorageUploadResult> {
    const supabase = await supabaseServerClient();
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
    });
    if (error) {
      throw new Error(error.message);
    }
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
    return { path, url: data?.signedUrl ?? null };
  }

  async getSignedUrl(path: string): Promise<string | null> {
    const supabase = await supabaseServerClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (error) {
      return null;
    }
    return data.signedUrl;
  }

  async remove(path: string): Promise<void> {
    const supabase = await supabaseServerClient();
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      throw new Error(error.message);
    }
  }
}
