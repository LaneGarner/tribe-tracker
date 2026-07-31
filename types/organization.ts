import { OrganizationRole } from './membership';

export interface OrganizationSummary {
  id: string;
  name: string;
  roles: OrganizationRole[];
  sponsoredProExpiresAt?: string;
}

export interface OrganizationTeam {
  id: string;
  organizationId: string;
  name: string;
  memberCount: number;
  roles: OrganizationRole[];
}

export interface OrganizationMember {
  membershipId: string;
  userId: string;
  name: string;
  email?: string;
  roles: OrganizationRole[];
  teamIds: string[];
  teamRole?: 'team_manager' | 'member';
}

export interface OrganizationReport {
  participantCount?: number;
  eligibleMemberCount?: number;
  challengeCount?: number;
  checkInCount?: number;
  suppressed: boolean;
  suppressionThreshold: number;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  teamId?: string;
  email?: string;
  expiresAt: string;
  joinUrl?: string;
}
