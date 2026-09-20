import type { ImagePickerOptions, ImageSource } from './types';

export const MAX_WEB_IMAGE_BYTES = 10 * 1024 * 1024;
export const SUPPORTED_WEB_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function validateWebImageFile(file: Pick<File, 'size' | 'type'>): void {
  if (!SUPPORTED_WEB_IMAGE_TYPES.has(file.type.toLowerCase())) {
    throw new Error('Choose a JPEG, PNG, or WebP image.');
  }
  if (file.size <= 0 || file.size > MAX_WEB_IMAGE_BYTES) {
    throw new Error('Choose an image smaller than 10 MB.');
  }
}

export function scheduleFilePickerCancellationCheck(
  hasSelectedFile: () => boolean,
  onCancel: () => void,
  schedule: (callback: () => void, delay: number) => unknown = window.setTimeout.bind(window)
): void {
  schedule(() => {
    if (!hasSelectedFile()) onCancel();
  }, 300);
}

export async function pickImage(
  source: ImageSource,
  _options?: ImagePickerOptions
): Promise<string | null> {
  if (typeof document === 'undefined') return null;

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.capture = 'environment';

    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onWindowFocus);
      resolve(value);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onWindowFocus);
      reject(error);
    };
    const onWindowFocus = () => {
      // Browsers do not consistently dispatch `cancel` for file inputs. Focus
      // returns after the chooser closes; allow its change event to run first.
      scheduleFilePickerCancellationCheck(
        () => Boolean(input.files?.length),
        () => finish(null)
      );
    };

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      try {
        validateWebImageFile(file);
      } catch (error) {
        fail(error instanceof Error ? error : new Error('This image is not supported.'));
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        finish(typeof reader.result === 'string' ? reader.result : null)
      );
      reader.addEventListener('error', () => finish(null));
      reader.readAsDataURL(file);
    }, { once: true });
    input.addEventListener('cancel', () => finish(null), { once: true });
    window.addEventListener('focus', onWindowFocus, { once: true });
    input.click();
  });
}
