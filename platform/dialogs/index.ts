// TypeScript fallback; Metro selects index.native.ts or index.web.ts first.
export { showActionSheet, showDialog } from './index.native';
export type {
  ActionSheetOptions,
  DialogAction,
  DialogActionRole,
  DialogOptions,
  DialogResult,
} from './types';
