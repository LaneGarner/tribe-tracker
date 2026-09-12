import { Alert } from 'react-native';
import type {
  ActionSheetOptions,
  DialogOptions,
  DialogResult,
  PromptOptions,
} from './types';

function present(options: DialogOptions): Promise<DialogResult> {
  return new Promise(resolve => {
    const actions = options.actions ?? [{ key: 'ok', label: 'OK' }];
    Alert.alert(
      options.title,
      options.message,
      actions.map(action => ({
        text: action.label,
        style: action.role === 'default' ? undefined : action.role,
        onPress: () => resolve(action.key),
      })),
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}

export function showDialog(options: DialogOptions): Promise<DialogResult> {
  return present(options);
}

export function showActionSheet(
  options: ActionSheetOptions
): Promise<DialogResult> {
  return present(options);
}

export function showPrompt(options: PromptOptions): Promise<string | null> {
  return new Promise(resolve => {
    Alert.prompt(
      options.title,
      options.message,
      value => resolve(value || null),
      'plain-text',
      options.defaultValue,
      options.keyboardType
    );
  });
}
