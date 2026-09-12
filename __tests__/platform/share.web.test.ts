import { shareContentWithBrowser } from '../../platform/share/index.web';

const content = { title: 'Join', message: 'Invite message', url: 'https://example.test/invite' };

describe('browser share capability', () => {
  it('uses native browser sharing when available', async () => {
    const share = jest.fn().mockResolvedValue(undefined);
    const writeText = jest.fn();
    await expect(shareContentWithBrowser(content, {
      share,
      clipboard: { writeText },
    })).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({
      title: 'Join', text: 'Invite message', url: 'https://example.test/invite',
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the complete message when share is unsupported or fails', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    await expect(shareContentWithBrowser(content, {
      share: jest.fn().mockRejectedValue(new Error('unsupported')),
      clipboard: { writeText },
    })).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Invite message');
  });

  it('preserves user cancellation instead of unexpectedly copying', async () => {
    const cancelled = new Error('cancelled');
    cancelled.name = 'AbortError';
    const writeText = jest.fn();
    await expect(shareContentWithBrowser(content, {
      share: jest.fn().mockRejectedValue(cancelled),
      clipboard: { writeText },
    })).rejects.toMatchObject({ name: 'AbortError' });
    expect(writeText).not.toHaveBeenCalled();
  });
});
