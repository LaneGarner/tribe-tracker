export type DialogActionRole = 'default' | 'cancel' | 'destructive';

export interface DialogAction {
  key: string;
  label: string;
  role?: DialogActionRole;
}

export interface DialogOptions {
  title: string;
  message?: string;
  actions?: DialogAction[];
}

export interface ActionSheetOptions extends DialogOptions {
  actions: DialogAction[];
}

export type DialogResult = string | null;
