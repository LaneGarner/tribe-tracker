import { API_URL } from '../config/api';
import { MembershipState } from '../types/membership';

interface CapabilityResponse {
  effectivePlan: MembershipState['tier'];
  organizationRoles: Array<{
    organizationId: string;
    organizationRole: 'organization_admin' | 'member';
    teams: Array<{ teamId: string; role: 'team_manager' | 'member' }>;
  }>;
  limits: {
    activePersonalChallenges: number;
    activePersonalChallengeLimit: number | null;
  };
  features: Record<string, boolean>;
}

export async function fetchMembership(
  accessToken: string
): Promise<MembershipState> {
  const response = await fetch(`${API_URL}/api/users?resource=capabilities`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Unable to refresh membership');
  }

  const body = (await response.json()) as CapabilityResponse;
  const limit = body.limits.activePersonalChallengeLimit;
  return {
    tier: body.effectivePlan,
    source:
      body.effectivePlan === 'sponsored_pro'
        ? 'organization'
        : body.effectivePlan === 'individual_pro'
          ? 'server'
          : 'none',
    capabilities: {
      canCreatePersonalChallenge: Boolean(body.features.createPersonalChallenge),
      personalChallengeSlotsRemaining:
        limit == null
          ? null
          : Math.max(0, limit - body.limits.activePersonalChallenges),
      canGenerateChallenge: Boolean(body.features.aiGeneratedChallengeDrafts),
      canUseBasicChat: Boolean(body.features.basicChat),
      canUseEnhancedAccountability: Boolean(body.features.enhancedAccountability),
      canUseBasicBadges: Boolean(body.features.basicBadges),
      canUseExpandedBadgesAndLevels: Boolean(body.features.expandedBadges),
      canUseAdvancedStreaks: Boolean(body.features.advancedStreaks),
      canViewAnalytics: Boolean(body.features.analytics),
      canViewFullHistory: Boolean(body.features.fullHistory),
      canUseGuidedPrograms: Boolean(body.features.guidedPrograms),
      canCustomizeChallenges: Boolean(body.features.customization),
    },
    organizations: body.organizationRoles.map(organization => ({
      organizationId: organization.organizationId,
      organizationName: 'Organization',
      roles: [
        organization.organizationRole,
        ...(organization.teams.some(team => team.role === 'team_manager')
          ? (['team_manager'] as const)
          : []),
      ],
      teamIds: organization.teams.map(team => team.teamId),
    })),
  };
}

export async function syncPurchasedMembership(
  accessToken: string
): Promise<{ active: boolean; status: string }> {
  const response = await fetch(
    `${API_URL}/api/users?resource=subscription-sync`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      body?.error || 'Subscription verification is temporarily unavailable.'
    );
  }
  return body.subscription;
}
