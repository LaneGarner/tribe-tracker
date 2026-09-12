import type {
  ActionSheetOptions,
  DialogAction,
  DialogOptions,
  DialogResult,
} from './types';

const overlayStyle = [
  'position:fixed',
  'inset:0',
  'z-index:2147483647',
  'display:flex',
  'align-items:center',
  'justify-content:center',
  'padding:24px',
  'background:rgba(0,0,0,.5)',
].join(';');

function buttonStyle(action: DialogAction): string {
  const color = action.role === 'destructive' ? '#DC2626' : '#2563EB';
  return [
    'min-height:44px',
    'padding:10px 14px',
    'border:0',
    'border-radius:8px',
    'background:transparent',
    `color:${color}`,
    'font:600 16px system-ui,sans-serif',
    'cursor:pointer',
  ].join(';');
}

function present(options: DialogOptions): Promise<DialogResult> {
  if (typeof document === 'undefined') return Promise.resolve(null);

  return new Promise(resolve => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const overlay = document.createElement('div');
    const dialog = document.createElement('div');
    const title = document.createElement('h2');
    const actionsContainer = document.createElement('div');
    const actions = options.actions ?? [{ key: 'ok', label: 'OK' }];
    let settled = false;

    overlay.setAttribute('style', overlayStyle);
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute(
      'style',
      'width:min(100%,420px);padding:24px;border-radius:14px;background:#fff;color:#111827;box-shadow:0 20px 50px rgba(0,0,0,.25);font-family:system-ui,sans-serif'
    );
    title.id = `tribe-dialog-title-${Date.now()}`;
    title.textContent = options.title;
    title.setAttribute('style', 'margin:0;font-size:20px;line-height:1.3');
    dialog.setAttribute('aria-labelledby', title.id);
    dialog.appendChild(title);

    if (options.message) {
      const message = document.createElement('p');
      message.id = `tribe-dialog-message-${Date.now()}`;
      message.textContent = options.message;
      message.setAttribute('style', 'margin:12px 0 0;color:#4B5563;line-height:1.5');
      dialog.setAttribute('aria-describedby', message.id);
      dialog.appendChild(message);
    }

    actionsContainer.setAttribute(
      'style',
      'display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:20px'
    );

    const finish = (result: DialogResult) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      previouslyFocused?.focus();
      resolve(result);
    };
    const cancelAction = actions.find(action => action.role === 'cancel');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(cancelAction?.key ?? null);
      }
      if (event.key === 'Tab') {
        const buttons = Array.from(
          actionsContainer.querySelectorAll<HTMLButtonElement>('button')
        );
        if (buttons.length === 0) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    actions.forEach(action => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      button.dataset.action = action.key;
      button.setAttribute('style', buttonStyle(action));
      button.addEventListener('click', () => finish(action.key));
      actionsContainer.appendChild(button);
    });

    dialog.appendChild(actionsContainer);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) finish(cancelAction?.key ?? null);
    });
    document.addEventListener('keydown', onKeyDown);
    document.body.appendChild(overlay);
    const preferred = cancelAction
      ? actionsContainer.querySelector<HTMLButtonElement>(
          `[data-action="${CSS.escape(cancelAction.key)}"]`
        )
      : actionsContainer.querySelector<HTMLButtonElement>('button');
    preferred?.focus();
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
