import { supabase } from '../lib/supabase';
import type { JobPhoto } from '../types';

const BUCKET = 'job-photos';

export async function uploadJobPhoto(
  orderId: string,
  file: File,
  uploadedBy: string
): Promise<JobPhoto> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${orderId}/${timestamp}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: photo, error: insertError } = await supabase
    .from('job_photos')
    .insert({
      order_id: orderId,
      storage_path: path,
      public_url: urlData.publicUrl,
      uploaded_by: uploadedBy,
      file_type: file.type,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  return photo;
}

export async function getPhotosByOrderId(orderId: string): Promise<JobPhoto[]> {
  const { data, error } = await supabase
    .from('job_photos')
    .select('*')
    .eq('order_id', orderId)
    .order('uploaded_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function deleteJobPhoto(photoId: string, storagePath: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([storagePath]);
  await supabase.from('job_photos').delete().eq('id', photoId);
}
