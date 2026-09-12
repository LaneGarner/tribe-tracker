import { Alert } from 'react-native';
import type {
  ActionSheetOptions,
  DialogOptions,
  DialogResult,
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
