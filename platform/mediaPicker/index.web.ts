import type { ImagePickerOptions, ImageSource } from './types';

export async function pickImage(
  source: ImageSource,
  _options?: ImagePickerOptions
): Promise<string | null> {
  if (typeof document === 'undefined') return null;

  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.capture = 'environment';

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        resolve(typeof reader.result === 'string' ? reader.result : null)
      );
      reader.addEventListener('error', () => resolve(null));
      reader.readAsDataURL(file);
    }, { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}
