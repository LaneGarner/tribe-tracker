import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

export async function pickImage(
  source: 'camera' | 'library',
  options?: { aspect?: [number, number]; quality?: number }
): Promise<string | null> {
  const permissionResult =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permissionResult.granted) {
    return null;
  }

  const launchFn =
    source === 'camera'
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

  const result = await launchFn({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: options?.aspect ?? [1, 1],
    quality: options?.quality ?? 0.7,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  return result.assets[0].uri;
}

export async function uploadAvatar(
  userId: string,
  localUri: string
): Promise<string> {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const filePath = `${userId}/avatar.jpg`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, arrayBuffer, {
      contentType: 'image/jpeg',
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
  const arrayBuffer = await response.arrayBuffer();
  const filePath = `${challengeId}/background.jpg`;

  const { error } = await supabase.storage
    .from('challenge-backgrounds')
    .upload(filePath, arrayBuffer, {
      contentType: 'image/jpeg',
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
