import { API_URL } from '../config/api';
import {
  OrganizationInvitation,
  OrganizationMember,
  OrganizationReport,
  OrganizationSummary,
  OrganizationTeam,
} from '../types/organization';
import { organizationInviteUrl } from '../config/links';

interface OrganizationMembershipResponse {
  role: 'organization_admin' | 'member';
  sponsored_pro_enabled?: boolean;
  organizations: {
    id: string;
    name: string;
  } | null;
}

interface TeamResponse {
  id: string;
  organization_id: string;
  name: string;
}

interface MemberResponse {
  id: string;
  user_id: string;
  role: 'organization_admin' | 'member';
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  teamRoles?: Array<{
    team_id: string;
    role: 'team_manager' | 'member';
  }>;
}

interface ReportResponse {
  suppressed: boolean;
  suppression_threshold: number;
  eligible_members: number | null;
  challenge_count: number | null;
  participating_members: number | null;
  checkin_count: number | null;
}

interface InvitationResponse {
  id: string;
  organization_id: string;
  team_id?: string | null;
  challenge_id?: string | null;
  invited_email?: string | null;
  expires_at: string;
}

export class OrganizationRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'OrganizationRequestError';
  }
}

async function request<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new OrganizationRequestError(
      body?.error || 'Organization request failed.',
      response.status
    );
  }
  return body as T;
}

export async function getOrganizations(accessToken: string) {
  const body = await request<{ memberships: OrganizationMembershipResponse[] }>(
    accessToken,
    '/api/users?resource=organizations'
  );
  return (body.memberships || []).flatMap<OrganizationSummary>(membership => {
    const organization = membership.organizations;
    if (!organization) return [];
    return [{
      id: organization.id,
      name: organization.name,
      roles: [membership.role],
    }];
  });
}

export async function getOrganizationTeams(
  accessToken: string,
  organizationId: string
) {
  const body = await request<{ teams: TeamResponse[] }>(
    accessToken,
    `/api/users?resource=organization-teams&organizationId=${encodeURIComponent(organizationId)}`
  );
  return (body.teams || []).map<OrganizationTeam>(team => ({
    id: team.id,
    organizationId: team.organization_id,
    name: team.name,
    memberCount: 0,
    roles: [],
  }));
}

export async function getOrganizationMembers(
  accessToken: string,
  organizationId: string,
  teamId?: string
) {
  const team = teamId ? `&teamId=${encodeURIComponent(teamId)}` : '';
  const body = await request<{ members: MemberResponse[] }>(
    accessToken,
    `/api/users?resource=organization-members&organizationId=${encodeURIComponent(organizationId)}${team}`
  );
  return (body.members || []).map<OrganizationMember>(member => ({
    membershipId: member.id,
    userId: member.user_id,
    name:
      member.profiles?.full_name ||
      member.profiles?.email ||
      'Organization member',
    email: member.profiles?.email || undefined,
    roles: [
      member.role,
      ...(member.teamRoles?.some(team => team.role === 'team_manager')
        ? (['team_manager'] as const)
        : []),
    ],
    teamIds: member.teamRoles?.map(team => team.team_id) || [],
    teamRole: teamId
      ? member.teamRoles?.find(team => team.team_id === teamId)?.role
      : undefined,
  }));
}

export async function createOrganizationTeam(
  accessToken: string,
  organizationId: string,
  name: string
) {
  const body = await request<{ team: TeamResponse }>(
    accessToken,
    `/api/users?resource=organization-teams&organizationId=${encodeURIComponent(organizationId)}`,
    { method: 'POST', body: JSON.stringify({ name }) }
  );
  return {
    id: body.team.id,
    organizationId: body.team.organization_id,
    name: body.team.name,
    memberCount: 0,
    roles: [],
  } satisfies OrganizationTeam;
}

export async function assignOrganizationTeamMember(
  accessToken: string,
  input: {
    organizationId: string;
    teamId: string;
    membershipId: string;
    role: 'team_manager' | 'member';
  }
) {
  await request(
    accessToken,
    `/api/users?resource=organization-team-members&organizationId=${encodeURIComponent(input.organizationId)}&teamId=${encodeURIComponent(input.teamId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        membershipId: input.membershipId,
        role: input.role,
      }),
    }
  );
}

export async function getOrganizationReport(
  accessToken: string,
  organizationId: string,
  teamId: string
) {
  const body = await request<{ report: ReportResponse | null }>(
    accessToken,
    `/api/users?resource=organization-report&organizationId=${encodeURIComponent(organizationId)}&teamId=${encodeURIComponent(teamId)}`
  );
  if (!body.report) return null;
  return {
    suppressed: body.report.suppressed,
    suppressionThreshold: body.report.suppression_threshold,
    eligibleMemberCount: body.report.eligible_members ?? undefined,
    challengeCount: body.report.challenge_count ?? undefined,
    participantCount: body.report.participating_members ?? undefined,
    checkInCount: body.report.checkin_count ?? undefined,
  } satisfies OrganizationReport;
}

export async function createOrganizationInvitation(
  accessToken: string,
  input: { organizationId: string; teamId?: string; email?: string }
) {
  const body = await request<{
    invitation: InvitationResponse;
    token: string;
  }>(
    accessToken,
    `/api/users?resource=organization-invitations&organizationId=${encodeURIComponent(input.organizationId)}${input.teamId ? `&teamId=${encodeURIComponent(input.teamId)}` : ''}`,
    { method: 'POST', body: JSON.stringify(input) }
  );
  return {
    id: body.invitation.id,
    organizationId: body.invitation.organization_id,
    teamId: body.invitation.team_id || undefined,
    email: body.invitation.invited_email || undefined,
    expiresAt: body.invitation.expires_at,
    joinUrl: organizationInviteUrl(body.token),
  } satisfies OrganizationInvitation;
}

export async function removeOrganizationMember(
  accessToken: string,
  organizationId: string,
  membershipId: string,
  teamId?: string
) {
  const team = teamId ? `&teamId=${encodeURIComponent(teamId)}` : '';
  await request(
    accessToken,
    `/api/users?resource=organization-member&organizationId=${encodeURIComponent(organizationId)}&membershipId=${encodeURIComponent(membershipId)}${team}`,
    { method: 'DELETE' }
  );
}

export async function getOrganizationInvite(
  accessToken: string,
  token: string
) {
  const body = await request<{
    invitation: {
      organizationId: string;
      organizationName: string;
      teamId?: string | null;
      teamName?: string | null;
      challengeId?: string | null;
      challengeName?: string | null;
      inviteCode?: string | null;
      expiresAt: string;
    };
  }>(
    accessToken,
    `/api/users?resource=organization-invite&token=${encodeURIComponent(token)}`
  );
  return {
    organization: {
      id: body.invitation.organizationId,
      name: body.invitation.organizationName,
      roles: [],
    } satisfies OrganizationSummary,
    team: body.invitation.teamId
      ? {
          id: body.invitation.teamId,
          organizationId: body.invitation.organizationId,
          name: body.invitation.teamName || 'Team',
          memberCount: 0,
          roles: [],
        } satisfies OrganizationTeam
      : undefined,
    challenge: body.invitation.challengeId
      ? {
          id: body.invitation.challengeId,
          name: body.invitation.challengeName || 'Challenge',
          inviteCode: body.invitation.inviteCode || undefined,
        }
      : undefined,
  };
}

export async function acceptOrganizationInvite(
  accessToken: string,
  token: string
) {
  return request<{ membership: unknown }>(
    accessToken,
    `/api/users?resource=organization-invite&token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        token,
        adultAttested: true,
        policyVersion: 'launch-v1',
      }),
    }
  );
}
