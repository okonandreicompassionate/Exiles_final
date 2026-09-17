import { supabase } from "./supabase";

const BUCKET = "product-images";

/**
 * Uploads a file to the public `product-images` Storage bucket and returns
 * its public URL. Requires an authenticated (admin) session — see
 * supabase/setup-storage.sql for the bucket + RLS policies this depends on.
 */
export async function uploadProductImage(file: File): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured");

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
