import Constants from 'expo-constants';

type ExtraLinks = {
  TERMS_URL?: string;
  PRIVACY_URL?: string;
  SUPPORT_URL?: string;
  COMMUNITY_GUIDELINES_URL?: string;
  ACCOUNT_DELETION_URL?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraLinks;
export const WEB_BASE_URL = 'https://tribe-tracker-backend.vercel.app';

export function organizationInviteUrl(token: string): string {
  return `${WEB_BASE_URL}/organization-invite/${encodeURIComponent(token)}`;
}

export const APP_LINKS = {
  terms: extra.TERMS_URL || `${WEB_BASE_URL}/terms`,
  privacy: extra.PRIVACY_URL || `${WEB_BASE_URL}/privacy`,
  support: extra.SUPPORT_URL || `${WEB_BASE_URL}/support`,
  communityGuidelines:
    extra.COMMUNITY_GUIDELINES_URL || `${WEB_BASE_URL}/community-guidelines`,
  accountDeletion:
    extra.ACCOUNT_DELETION_URL || `${WEB_BASE_URL}/delete-account`,
} as const;
