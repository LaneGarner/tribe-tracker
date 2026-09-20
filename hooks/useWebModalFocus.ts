import { RefObject, useEffect } from 'react';
import { Platform } from 'react-native';

const FOCUSABLE = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

export function trappedFocusIndex(currentIndex: number, count: number, backwards: boolean): number {
  if (count <= 0) return -1;
  if (backwards) return currentIndex <= 0 ? count - 1 : currentIndex - 1;
  return currentIndex >= count - 1 ? 0 : currentIndex + 1;
}

export function useWebModalFocus(
  active: boolean,
  containerRef: RefObject<any>,
  initialFocusRef: RefObject<any>,
  onClose: () => void
): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || !active || typeof document === 'undefined') return;
    const returnTarget = document.activeElement as HTMLElement | null;
    const container = containerRef.current as HTMLElement | null;
    requestAnimationFrame(() => initialFocusRef.current?.focus?.());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(element => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const nextIndex = trappedFocusIndex(currentIndex, focusable.length, event.shiftKey);
      if ((event.shiftKey && currentIndex <= 0) || (!event.shiftKey && currentIndex >= focusable.length - 1)) {
        event.preventDefault();
        focusable[nextIndex].focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      requestAnimationFrame(() => returnTarget?.focus?.());
    };
  }, [active, containerRef, initialFocusRef, onClose]);
}
