import { supabase } from "@/integrations/supabase/client";

export const PHOTO_BUCKET = "activity-photos";

export type ActivityPhoto = {
  id: string;
  storage_path: string;
  caption: string;
  alt_text: string;
  visible: boolean;
  sort_order: number;
  url: string | null;
};

async function withUrls(rows: Omit<ActivityPhoto, "url">[]): Promise<ActivityPhoto[]> {
  if (!rows.length) return [];
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(
    rows.map((r) => r.storage_path),
    60 * 60 * 6,
  );
  return rows.map((r, i) => ({ ...r, url: data?.[i]?.signedUrl ?? null }));
}

/** Visible photos for the public homepage (RLS returns only visible rows to visitors). */
export async function listVisiblePhotos() {
  const { data, error } = await supabase
    .from("activity_photos")
    .select("id, storage_path, caption, alt_text, visible, sort_order")
    .eq("visible", true)
    .order("sort_order");
  if (error) throw error;
  return withUrls(data ?? []);
}

/** All photos, for administrators. */
export async function listAllPhotos() {
  const { data, error } = await supabase
    .from("activity_photos")
    .select("id, storage_path, caption, alt_text, visible, sort_order")
    .order("sort_order");
  if (error) throw error;
  return withUrls(data ?? []);
}

function newPath(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return `${crypto.randomUUID()}.${ext}`;
}

export async function uploadPhoto(file: File, caption: string, nextOrder: number) {
  const path = newPath(file);
  const up = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (up.error) throw up.error;
  const { error } = await supabase.from("activity_photos").insert({
    storage_path: path,
    caption,
    alt_text: caption,
    visible: true,
    sort_order: nextOrder,
  });
  if (error) throw error;
}

export async function replacePhoto(photo: ActivityPhoto, file: File) {
  const path = newPath(file);
  const up = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (up.error) throw up.error;
  const { error } = await supabase
    .from("activity_photos")
    .update({ storage_path: path })
    .eq("id", photo.id);
  if (error) throw error;
  await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
}

export async function updatePhoto(id: string, patch: { caption?: string; visible?: boolean }) {
  const full = patch.caption !== undefined ? { ...patch, alt_text: patch.caption } : patch;
  const { error } = await supabase.from("activity_photos").update(full).eq("id", id);
  if (error) throw error;
}

export async function deletePhoto(photo: ActivityPhoto) {
  const { error } = await supabase.from("activity_photos").delete().eq("id", photo.id);
  if (error) throw error;
  await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
}

export async function reorderPhotos(ids: string[]) {
  const { error } = await supabase.rpc("reorder_activity_photos", { photo_ids: ids });
  if (error) throw error;
}
