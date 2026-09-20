// TypeScript fallback; Metro selects index.native.ts or index.web.ts first.
export { showActionSheet, showDialog, showPrompt } from './index.native';
export type {
  ActionSheetOptions,
  DialogAction,
  DialogActionRole,
  DialogOptions,
  DialogResult,
  PromptOptions,
} from './types';
