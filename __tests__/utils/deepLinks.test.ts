import { parsePendingDeepLink } from '../../utils/deepLinks';

describe('parsePendingDeepLink', () => {
  const challengeId = 'c048f278-5ca7-4b60-81ab-5955bbd923fe';
  const organizationToken = 'organization_token_12345678901234';

  it.each([
    ['https://app.tribetracker.com/invite/ABC123', { type: 'challengeInvite', inviteCode: 'ABC123' }],
    [`tribetracker://challenge/${challengeId}`, { type: 'challenge', challengeId }],
    [`exp://127.0.0.1:8081/--/challenge/${challengeId}`, { type: 'challenge', challengeId }],
    [`https://app.tribetracker.com/organization-invite/${organizationToken}`, { type: 'organizationInvite', token: organizationToken }],
  ])('parses %s', (url, expected) => {
    expect(parsePendingDeepLink(url)).toEqual(expected);
  });

  it('ignores unrelated and reset-password URLs', () => {
    expect(parsePendingDeepLink('https://app.tribetracker.com/reset-password')).toBeNull();
    expect(parsePendingDeepLink('https://app.tribetracker.com/help')).toBeNull();
  });

  it.each([
    'https://attacker.example/invite/ABC123',
    'https://app.tribetracker.com/help?next=/invite/ABC123',
    'https://app.tribetracker.com/invite/ABC123/extra',
    'https://app.tribetracker.com/invite/ABC%2F123',
    'https://app.tribetracker.com/challenge/not-a-uuid',
    'https://app.tribetracker.com/organization-invite/short',
    'javascript:alert(1)',
    'not a url',
  ])('rejects non-canonical or unsafe URL %s', url => {
    expect(parsePendingDeepLink(url)).toBeNull();
  });
});
