export type MembershipTier = 'free' | 'individual_pro' | 'sponsored_pro';
export type EntitlementSource =
  | 'none'
  | 'apple'
  | 'google'
  | 'organization'
  | 'server'
  | 'mock';
export type OrganizationRole =
  | 'member'
  | 'team_manager'
  | 'organization_admin'
  | 'platform_admin';

export interface OrganizationAccess {
  organizationId: string;
  organizationName: string;
  roles: OrganizationRole[];
  teamIds: string[];
}

export interface MembershipCapabilities {
  canCreatePersonalChallenge: boolean;
  personalChallengeSlotsRemaining: number | null;
  canGenerateChallenge: boolean;
  canUseBasicChat: boolean;
  canUseEnhancedAccountability: boolean;
  canUseBasicBadges: boolean;
  canUseExpandedBadgesAndLevels: boolean;
  canUseAdvancedStreaks: boolean;
  canViewAnalytics: boolean;
  canViewFullHistory: boolean;
  canUseGuidedPrograms: boolean;
  canCustomizeChallenges: boolean;
}

export type MembershipCapability = keyof MembershipCapabilities;

export interface MembershipState {
  tier: MembershipTier;
  source: EntitlementSource;
  expiresAt?: string;
  storeSubscriptionActive?: boolean;
  storeSubscriptionExpiresAt?: string;
  capabilities: MembershipCapabilities;
  organizations: OrganizationAccess[];
}

export const SAFE_FREE_MEMBERSHIP: MembershipState = {
  tier: 'free',
  source: 'none',
  storeSubscriptionActive: false,
  capabilities: {
    canCreatePersonalChallenge: true,
    personalChallengeSlotsRemaining: 1,
    canGenerateChallenge: false,
    canUseBasicChat: true,
    canUseEnhancedAccountability: false,
    canUseBasicBadges: true,
    canUseExpandedBadgesAndLevels: false,
    canUseAdvancedStreaks: false,
    canViewAnalytics: false,
    canViewFullHistory: false,
    canUseGuidedPrograms: false,
    canCustomizeChallenges: false,
  },
  organizations: [],
};

export const PRO_CAPABILITIES: MembershipCapabilities = {
  canCreatePersonalChallenge: true,
  personalChallengeSlotsRemaining: null,
  canGenerateChallenge: true,
  canUseBasicChat: true,
  canUseEnhancedAccountability: true,
  canUseBasicBadges: true,
  canUseExpandedBadgesAndLevels: true,
  canUseAdvancedStreaks: true,
  canViewAnalytics: true,
  canViewFullHistory: true,
  canUseGuidedPrograms: true,
  canCustomizeChallenges: true,
};
