import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerOptions, ImageSource } from './types';

export async function pickImage(
  source: ImageSource,
  options?: ImagePickerOptions
): Promise<string | null> {
  const permissionResult =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permissionResult.granted) return null;

  const launch =
    source === 'camera'
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
  const result = await launch({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: options?.aspect ?? [1, 1],
    quality: options?.quality ?? 0.7,
  });

  return result.canceled ? null : result.assets?.[0]?.uri ?? null;
}
