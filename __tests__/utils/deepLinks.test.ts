import { parsePendingDeepLink } from '../../utils/deepLinks';

describe('parsePendingDeepLink', () => {
  it.each([
    ['https://app.tribetracker.com/invite/ABC123', { type: 'challengeInvite', inviteCode: 'ABC123' }],
    ['tribetracker://challenge/challenge-42', { type: 'challenge', challengeId: 'challenge-42' }],
    ['https://app.tribetracker.com/organization-invite/org_token-1', { type: 'organizationInvite', token: 'org_token-1' }],
  ])('parses %s', (url, expected) => {
    expect(parsePendingDeepLink(url)).toEqual(expected);
  });

  it('ignores unrelated and reset-password URLs', () => {
    expect(parsePendingDeepLink('https://app.tribetracker.com/reset-password')).toBeNull();
    expect(parsePendingDeepLink('https://app.tribetracker.com/help')).toBeNull();
  });
});
