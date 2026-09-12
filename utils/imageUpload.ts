import { supabase } from '../lib/supabase';
export { pickImage } from '../platform/mediaPicker';

export async function uploadAvatar(
  userId: string,
  localUri: string
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const filePath = `${userId}/avatar.jpg`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, arrayBuffer, {
      contentType: blob.type || 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function deleteAvatar(userId: string): Promise<void> {
  const { error } = await supabase.storage
    .from('avatars')
    .remove([`${userId}/avatar.jpg`]);

  if (error) throw error;
}

export async function uploadChallengeBackground(
  challengeId: string,
  localUri: string
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const filePath = `${challengeId}/background.jpg`;

  const { error } = await supabase.storage
    .from('challenge-backgrounds')
    .upload(filePath, arrayBuffer, {
      contentType: blob.type || 'image/jpeg',
      upsert: true,
    });

  if (error) {
    console.error('Challenge background upload error:', error.message, error);
    throw error;
  }

  const { data } = supabase.storage.from('challenge-backgrounds').getPublicUrl(filePath);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function deleteChallengeBackground(challengeId: string): Promise<void> {
  const { error } = await supabase.storage
    .from('challenge-backgrounds')
    .remove([`${challengeId}/background.jpg`]);

  if (error) throw error;
}
