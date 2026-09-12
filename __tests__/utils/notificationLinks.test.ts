import { resolveNotificationLink } from '../../utils/notificationLinks';

describe('resolveNotificationLink', () => {
  it('keeps relative notification destinations inside app navigation', () => {
    expect(resolveNotificationLink('/challenge/abc')).toEqual({
      kind: 'internal',
      path: '/challenge/abc',
    });
    expect(resolveNotificationLink('notifications')).toEqual({
      kind: 'internal',
      path: '/notifications',
    });
  });

  it('allows absolute HTTP links to remain external', () => {
    expect(resolveNotificationLink('https://example.com/help')).toEqual({
      kind: 'external',
      url: 'https://example.com/help',
    });
  });

  it('does not open unsupported URL schemes externally', () => {
    expect(resolveNotificationLink('javascript:alert(1)')).toEqual({
      kind: 'internal',
      path: '/javascript:alert(1)',
    });
  });
});
