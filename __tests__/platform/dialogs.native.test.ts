import { Alert } from 'react-native';
import { showActionSheet, showDialog } from '../../platform/dialogs/index.native';

describe('native dialog adapter', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('maps actions and resolves the selected key', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _message, buttons) => buttons?.[1]?.onPress?.()
    );

    await expect(
      showActionSheet({
        title: 'Challenge Options',
        actions: [
          { key: 'cancel', label: 'Cancel', role: 'cancel' },
          { key: 'delete', label: 'Delete', role: 'destructive' },
        ],
      })
    ).resolves.toBe('delete');

    expect(alert).toHaveBeenCalledWith(
      'Challenge Options',
      undefined,
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Delete', style: 'destructive' }),
      ]),
      expect.objectContaining({ cancelable: true })
    );
  });

  it('supplies the native OK action for informational dialogs', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _message, buttons) => buttons?.[0]?.onPress?.()
    );

    await expect(showDialog({ title: 'Saved' })).resolves.toBe('ok');
  });

  it('resolves null when a native dialog is dismissed', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _message, _buttons, options) => options?.onDismiss?.()
    );

    await expect(showDialog({ title: 'Dismiss me' })).resolves.toBeNull();
  });
});
