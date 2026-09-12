import { showDialog } from '.';
import type { DialogActionRole } from './types';

export interface AlertButton {
  text: string;
  style?: DialogActionRole;
  onPress?: () => void | Promise<void>;
}

export async function showAlert(
  title: string,
  message?: string,
  buttons: AlertButton[] = [{ text: 'OK' }]
): Promise<void> {
  const actions = buttons.map((button, index) => ({
    key: String(index),
    label: button.text,
    role: button.style,
  }));
  const result = await showDialog({ title, message, actions });
  if (result === null) return;
  await buttons[Number(result)]?.onPress?.();
}
