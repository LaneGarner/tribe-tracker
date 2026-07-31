jest.mock('../../config/api', () => ({
  API_URL: 'https://test-api.example',
}));

import {
  deleteAccount,
  RecentAuthenticationRequiredError,
} from '../../services/account';
import {
  fetchMembership,
  syncPurchasedMembership,
} from '../../services/membership';
import { submitContentReport } from '../../services/reports';
import {
  createOrganizationInvitation,
  createOrganizationTeam,
  assignOrganizationTeamMember,
  getOrganizationMembers,
  getOrganizationReport,
  getOrganizations,
  removeOrganizationMember,
} from '../../services/organizations';
import {
  fetchAIConsents,
  updateAIConsent,
} from '../../services/aiConsent';
import {
  AIChallengeDraftError,
  generateAIChallengeDraft,
} from '../../services/aiChallengeDrafts';
import { getBillingAdapter } from '../../services/billing';
import {
  ChallengeCreationError,
  createChallengeOnServer,
} from '../../services/challenges';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('launch service contracts', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    AsyncStorage.clear();
  });

  it('uses isolated organization adapters with scoped query parameters', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            memberships: [
              {
                role: 'organization_admin',
                organizations: { id: 'org-1', name: 'Example Org' },
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ members: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            report: {
              suppressed: true,
              suppression_threshold: 5,
              eligible_members: null,
              challenge_count: null,
              participating_members: null,
              checkin_count: null,
            },
          }),
      });

    await expect(getOrganizations('token')).resolves.toEqual([
      {
        id: 'org-1',
        name: 'Example Org',
        roles: ['organization_admin'],
      },
    ]);
    await getOrganizationMembers('token', 'org 1', 'team 1');
    await getOrganizationReport('token', 'org 1', 'team 1');

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://test-api.example/api/users?resource=organizations',
      expect.any(Object)
    );
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain(
      'resource=organization-members&organizationId=org%201&teamId=team%201'
    );
    expect((global.fetch as jest.Mock).mock.calls[2][0]).toContain(
      'resource=organization-report&organizationId=org%201&teamId=team%201'
    );
  });

  it('provides deterministic mock billing products and restore state in development', async () => {
    const billing = getBillingAdapter();
    await billing.configure('user-1');

    const products = await billing.getProducts();
    expect(products.map(product => product.localizedPrice)).toEqual([
      '$4.99',
      '$39.99',
    ]);

    await expect(billing.getCustomerState()).resolves.toEqual({
      proActive: false,
    });
    await billing.purchase(products[1].id);
    await expect(billing.restore()).resolves.toEqual(
      expect.objectContaining({ proActive: true })
    );
  });

  it('normalizes invitation links and keeps team removals team-scoped', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            invitation: {
              id: 'invite-1',
              organization_id: 'org-1',
              team_id: 'team-1',
              invited_email: null,
              expires_at: '2026-08-01T00:00:00.000Z',
            },
            token: 'secure-token',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    await expect(
      createOrganizationInvitation('token', {
        organizationId: 'org-1',
        teamId: 'team-1',
      })
    ).resolves.toEqual(
      expect.objectContaining({
        organizationId: 'org-1',
        teamId: 'team-1',
        joinUrl:
          'https://tribe-tracker-backend.vercel.app/organization-invite/secure-token',
      })
    );
    await removeOrganizationMember('token', 'org-1', 'membership-1', 'team-1');

    expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain(
      'resource=organization-member&organizationId=org-1&membershipId=membership-1&teamId=team-1'
    );
  });

  it('uses audited organization routes for team creation and manager assignment', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            team: {
              id: 'team-1',
              organization_id: 'org-1',
              name: 'Wellness Team',
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ teamMembership: { id: 'tm-1' } }),
      });

    await createOrganizationTeam('token', 'org-1', 'Wellness Team');
    await assignOrganizationTeamMember('token', {
      organizationId: 'org-1',
      teamId: 'team-1',
      membershipId: 'member-1',
      role: 'team_manager',
    });

    expect((global.fetch as jest.Mock).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Wellness Team' }),
      })
    );
    expect((global.fetch as jest.Mock).mock.calls[1][1]).toEqual(
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          membershipId: 'member-1',
          role: 'team_manager',
        }),
      })
    );
  });

  it('stores AI consent per purpose on the authenticated backend', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            consents: [
              {
                purpose: 'challenge_matching',
                granted: true,
                policy_version: 'ai-wellness-v1',
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            consent: {
              purpose: 'challenge_generation',
              granted: true,
              policy_version: 'ai-wellness-v1',
            },
          }),
      });

    await expect(fetchAIConsents('token')).resolves.toHaveLength(1);
    await updateAIConsent(
      'token',
      'challenge_generation',
      true,
      'ai-wellness-v1'
    );

    expect((global.fetch as jest.Mock).mock.calls[1][1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          purpose: 'challenge_generation',
          granted: true,
          policyVersion: 'ai-wellness-v1',
          explicitConsent: true,
        }),
      })
    );
  });

  it('keeps AI challenge drafting safely unavailable until its route lands', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve(null),
    });

    await expect(
      generateAIChallengeDraft('token', 'Build a walking routine')
    ).rejects.toEqual(
      expect.objectContaining<Partial<AIChallengeDraftError>>({
        code: 'unavailable',
      })
    );
  });

  it('uses the authenticated account deletion endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    await deleteAccount('token');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://test-api.example/api/users?resource=account',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      })
    );
  });

  it('loads server-authoritative capabilities', async () => {
    const capabilities = {
      effectivePlan: 'free',
      organizationRoles: [],
      limits: {
        activePersonalChallenges: 0,
        activePersonalChallengeLimit: 1,
      },
      features: {
        createPersonalChallenge: true,
        aiGeneratedChallengeDrafts: false,
        basicChat: true,
        enhancedAccountability: false,
        basicBadges: true,
        expandedBadges: false,
        advancedStreaks: false,
        analytics: false,
        fullHistory: false,
        guidedPrograms: false,
        customization: false,
      },
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(capabilities),
    });

    await expect(fetchMembership('token')).resolves.toEqual(
      expect.objectContaining({
        tier: 'free',
        source: 'none',
        capabilities: expect.objectContaining({
          canCreatePersonalChallenge: true,
          personalChallengeSlotsRemaining: 1,
          canUseBasicChat: true,
        }),
        organizations: [],
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      'https://test-api.example/api/users?resource=capabilities',
      { headers: { Authorization: 'Bearer token' } }
    );
  });

  it('requests authenticated server verification after a store purchase', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          subscription: { active: true, status: 'active' },
        }),
    });

    await expect(syncPurchasedMembership('token')).resolves.toEqual({
      active: true,
      status: 'active',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://test-api.example/api/users?resource=subscription-sync',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
        }),
      })
    );
  });

  it('surfaces the server-enforced Free challenge limit before local success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({
          error: 'Free accounts can have one active personal challenge',
          code: 'free_active_challenge_limit',
        }),
    });

    await expect(
      createChallengeOnServer(
        {
          id: 'challenge-2',
          name: 'Second active challenge',
          creatorId: 'user-1',
          durationDays: 30,
          startDate: '2026-07-30',
          habits: ['Check in'],
          isPublic: false,
          status: 'active',
          participantCount: 0,
        },
        'token'
      )
    ).rejects.toEqual(
      expect.objectContaining<Partial<ChallengeCreationError>>({
        code: 'free_active_challenge_limit',
      })
    );
  });

  it('submits a report without exposing report data in the URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    const report = {
      targetType: 'message' as const,
      targetId: 'message-1',
      reason: 'harassment' as const,
      contextId: 'conversation-1',
    };

    await submitContentReport('token', report);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://test-api.example/api/users?resource=reports',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          contentType: 'message',
          contentId: 'message-1',
          reason: 'harassment',
          details: 'Conversation context: conversation-1',
        }),
      })
    );
  });

  it('surfaces backend deletion errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Reauthentication required' }),
    });

    await expect(deleteAccount('token')).rejects.toThrow(
      'Reauthentication required'
    );
  });

  it('distinguishes recent-auth account deletion failures', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'Recent authentication required',
          code: 'reauthentication_required',
        }),
    });

    await expect(deleteAccount('token')).rejects.toBeInstanceOf(
      RecentAuthenticationRequiredError
    );
  });
});
