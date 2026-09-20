import { Alert } from 'react-native';
import { showActionSheet, showDialog, showPrompt } from '../../platform/dialogs/index.native';
import { showAlert } from '../../platform/dialogs/alert';

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

  it('returns native prompt input', async () => {
    jest.spyOn(Alert, 'prompt').mockImplementation(
      (_title, _message, callback) => typeof callback === 'function' && callback('person@example.com')
    );

    await expect(showPrompt({ title: 'Email' })).resolves.toBe('person@example.com');
  });

  it('runs only the callback selected through the shared alert adapter', async () => {
    const cancel = jest.fn();
    const remove = jest.fn();
    jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _message, buttons) => buttons?.[1]?.onPress?.()
    );
    await showAlert('Remove?', undefined, [
      { text: 'Cancel', style: 'cancel', onPress: cancel },
      { text: 'Remove', style: 'destructive', onPress: remove },
    ]);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
  });
});
