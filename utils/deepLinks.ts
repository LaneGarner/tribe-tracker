import { WEB_BASE_URL } from '../config/links';

export type PendingDeepLink =
  | { type: 'organizationInvite'; token: string }
  | { type: 'challengeInvite'; inviteCode: string }
  | { type: 'challenge'; challengeId: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INVITE_CODE_PATTERN = /^[A-Za-z0-9]+$/;
const ORGANIZATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;

function routePath(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol === 'tribetracker:') {
      return `/${url.hostname}${url.pathname}`;
    }
    if (url.protocol === 'exp:' || url.protocol === 'exps:') {
      const marker = url.pathname.indexOf('/--/');
      return marker >= 0 ? url.pathname.slice(marker + 3) : url.pathname;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    const allowedOrigins = new Set([
      new URL(WEB_BASE_URL).origin,
      'https://app.tribetracker.com',
      'https://tribe-tracker-backend.vercel.app',
    ]);
    if (!allowedOrigins.has(url.origin)) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

function decodedSegment(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value);
    return decoded.includes('/') || decoded.includes('\\') ? null : decoded;
  } catch {
    return null;
  }
}

export function parsePendingDeepLink(value: string): PendingDeepLink | null {
  const path = routePath(value);
  if (!path) return null;
  const segments = path.split('/').filter(Boolean);
  if (segments.length !== 2) return null;
  const identifier = decodedSegment(segments[1]);
  if (!identifier) return null;

  if (segments[0] === 'organization-invite' && ORGANIZATION_TOKEN_PATTERN.test(identifier)) {
    return { type: 'organizationInvite', token: identifier };
  }
  if (segments[0] === 'invite' && INVITE_CODE_PATTERN.test(identifier)) {
    return { type: 'challengeInvite', inviteCode: identifier };
  }
  if (segments[0] === 'challenge' && UUID_PATTERN.test(identifier)) {
    return { type: 'challenge', challengeId: identifier };
  }
  return null;
}
