import Constants from 'expo-constants';

type ExtraLinks = {
  TERMS_URL?: string;
  PRIVACY_URL?: string;
  SUPPORT_URL?: string;
  COMMUNITY_GUIDELINES_URL?: string;
  ACCOUNT_DELETION_URL?: string;
  WEB_APP_URL?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraLinks;
const backendUrl = 'https://tribe-tracker-backend.vercel.app';

export const WEB_BASE_URL =
  extra.WEB_APP_URL ||
  (typeof window === 'undefined' ? 'https://app.tribetracker.com' : window.location.origin);

export function organizationInviteUrl(token: string): string {
  return `${WEB_BASE_URL}/organization-invite/${encodeURIComponent(token)}`;
}

export const APP_LINKS = {
  terms: extra.TERMS_URL || `${backendUrl}/terms`,
  privacy: extra.PRIVACY_URL || `${backendUrl}/privacy`,
  support: extra.SUPPORT_URL || `${backendUrl}/support`,
  communityGuidelines:
    extra.COMMUNITY_GUIDELINES_URL || `${backendUrl}/community-guidelines`,
  accountDeletion:
    extra.ACCOUNT_DELETION_URL || `${backendUrl}/delete-account`,
  passwordReset: `${WEB_BASE_URL}/reset-password`,
} as const;

export function passwordResetRedirectUrl(): string {
  return APP_LINKS.passwordReset;
}
