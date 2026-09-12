export type PendingDeepLink =
  | { type: 'organizationInvite'; token: string }
  | { type: 'challengeInvite'; inviteCode: string }
  | { type: 'challenge'; challengeId: string };

export function parsePendingDeepLink(url: string): PendingDeepLink | null {
  const organizationInvite = url.match(/organization-invite\/([A-Za-z0-9_-]+)/);
  if (organizationInvite) {
    return { type: 'organizationInvite', token: organizationInvite[1] };
  }

  const challengeInvite = url.match(/invite\/([A-Za-z0-9]+)/);
  if (challengeInvite) {
    return { type: 'challengeInvite', inviteCode: challengeInvite[1] };
  }

  const challenge = url.match(/challenge\/([A-Za-z0-9-]+)/);
  if (challenge) {
    return { type: 'challenge', challengeId: challenge[1] };
  }

  return null;
}
