import * as Crypto from 'expo-crypto';
import { RootState } from '../redux/store';
import { BadgeDefinition, UserBadge } from '../types';
import { getChallengeStatus } from './dateUtils';
import { calculateLevel } from '../redux/slices/badgesSlice';

interface UserStats {
  totalCheckins: number;
  maxLongestStreak: number;
  challengesJoined: number;
  challengesCreated: number;
  publicChallengesCreated: number;
  completedChallengeCount: number;
  profileComplete: boolean;
  podiumCount: number;
  totalWins: number;
  level: number;
}

function gatherStats(state: RootState, userId: string): UserStats {
  const userCheckins = state.checkins.data.filter(c => c.userId === userId);
  const userParticipants = state.participants.data.filter(p => p.userId === userId);
  const userChallenges = state.challenges.data.filter(c => c.creatorId === userId);

  const totalCheckins = userCheckins.length;
  const maxLongestStreak = userParticipants.reduce(
    (max, p) => Math.max(max, p.longestStreak || 0),
    0
  );
  const challengesJoined = userParticipants.length;
  const challengesCreated = userChallenges.length;
  const publicChallengesCreated = userChallenges.filter(c => c.isPublic).length;

  // Find completed challenges user participated in
  const userChallengeIds = new Set(userParticipants.map(p => p.challengeId));
  const completedChallenges = state.challenges.data.filter(
    c =>
      userChallengeIds.has(c.id) &&
      c.endDate &&
      getChallengeStatus(c.startDate, c.endDate) === 'completed'
  );

  const completedChallengeCount = completedChallenges.length;

  // Count podium finishes (top 3) and wins (1st) across all completed challenges
  let podiumCount = 0;
  let totalWins = 0;

  for (const challenge of completedChallenges) {
    const participants = state.participants.data
      .filter(p => p.challengeId === challenge.id)
      .sort((a, b) => b.totalPoints - a.totalPoints);

    const userIndex = participants.findIndex(p => p.userId === userId);
    if (userIndex !== -1) {
      const userPoints = participants[userIndex].totalPoints;
      const rank = participants.filter(p => p.totalPoints > userPoints).length + 1;
      if (rank <= 3) podiumCount++;
      if (rank === 1) totalWins++;
    }
  }

  // Profile completeness
  const profile = state.profile.data;
  const profileComplete = !!(
    profile &&
    profile.fullName?.trim() &&
    profile.bio?.trim() &&
    profile.profilePhotoUrl?.trim()
  );

  return {
    totalCheckins,
    maxLongestStreak,
    challengesJoined,
    challengesCreated,
    publicChallengesCreated,
    completedChallengeCount,
    profileComplete,
    podiumCount,
    totalWins,
    level: state.badges.level,
  };
}

function isAlreadyEarned(
  earned: UserBadge[],
  badgeId: string,
  challengeId?: string
): boolean {
  return earned.some(
    b => b.badgeId === badgeId && b.challengeId === challengeId
  );
}

// Map slug to what stat it checks. requirementType is generic ('event' / 'count' / 'streak' / 'level').
// Placement-related slugs (podium_*, wins_*) are treated as count-based single-earn here, not per-challenge.
type StatKind =
  | 'checkin'
  | 'challenge_join'
  | 'challenge_create'
  | 'challenge_public'
  | 'challenge_complete'
  | 'podium'
  | 'wins'
  | 'profile'
  | 'invite'
  | null;

function getStatForSlug(slug: string): StatKind {
  if (slug === 'first_checkin' || slug.startsWith('checkins_')) return 'checkin';
  if (slug === 'first_challenge' || slug.startsWith('challenges_joined_')) return 'challenge_join';
  if (slug === 'create_challenge') return 'challenge_create';
  if (slug === 'public_challenge' || slug.startsWith('public_')) return 'challenge_public';
  if (slug === 'challenge_complete' || slug.startsWith('challenges_completed_')) return 'challenge_complete';
  if (slug.startsWith('podium_')) return 'podium';
  if (slug.startsWith('wins_')) return 'wins';
  if (slug === 'profile_complete') return 'profile';
  if (slug === 'first_invite' || slug === 'invites_5') return 'invite';
  return null;
}

function checkBadge(
  def: BadgeDefinition,
  stats: UserStats,
  earned: UserBadge[]
): UserBadge[] {
  const { requirementType, requirementValue, slug } = def;
  const value = requirementValue ?? 1;
  const newBadges: UserBadge[] = [];

  const makeBadge = (challengeId?: string): UserBadge => ({
    id: Crypto.randomUUID(),
    badgeId: def.id,
    earnedAt: new Date().toISOString(),
    challengeId,
    metadata: {},
  });

  // All badges in the new tiered system are single-earn (no per-challenge scoping).
  if (isAlreadyEarned(earned, def.id)) return newBadges;

  switch (requirementType) {
    case 'streak':
      if (stats.maxLongestStreak >= value) {
        newBadges.push(makeBadge());
      }
      break;

    case 'level':
      if (stats.level >= value) {
        newBadges.push(makeBadge());
      }
      break;

    case 'placement':
    case 'event':
    case 'count': {
      const stat = getStatForSlug(slug);
      let met = false;

      switch (stat) {
        case 'checkin':
          met = stats.totalCheckins >= value;
          break;
        case 'challenge_join':
          met = stats.challengesJoined >= value;
          break;
        case 'challenge_create':
          met = stats.challengesCreated >= value;
          break;
        case 'challenge_public':
          met = stats.publicChallengesCreated >= value;
          break;
        case 'challenge_complete':
          met = stats.completedChallengeCount >= value;
          break;
        case 'podium':
          met = stats.podiumCount >= value;
          break;
        case 'wins':
          met = stats.totalWins >= value;
          break;
        case 'profile':
          met = stats.profileComplete;
          break;
        case 'invite':
          // Deferred — no invite tracking yet
          break;
        default:
          break;
      }

      if (met) {
        newBadges.push(makeBadge());
      }
      break;
    }

    default:
      break;
  }

  return newBadges;
}

export function evaluateNewBadges(
  state: RootState,
  userId: string
): UserBadge[] {
  const { definitions, earned } = state.badges;
  if (definitions.length === 0) return [];

  const stats = gatherStats(state, userId);
  const allNew: UserBadge[] = [];

  for (const def of definitions) {
    const newBadges = checkBadge(def, stats, [...earned, ...allNew]);
    allNew.push(...newBadges);
  }

  // After awarding badges, check if new level badges are now earned
  // (earning badges increases points which may increase level)
  if (allNew.length > 0) {
    const newPoints = allNew.reduce((sum, b) => {
      const def = definitions.find(d => d.id === b.badgeId);
      return sum + (def?.points || 0);
    }, 0);
    const newLevel = calculateLevel(state.badges.totalPoints + newPoints);
    if (newLevel > stats.level) {
      const updatedStats = { ...stats, level: newLevel };
      const allEarned = [...earned, ...allNew];
      for (const def of definitions) {
        if (def.requirementType === 'level') {
          const levelBadges = checkBadge(def, updatedStats, allEarned);
          allNew.push(...levelBadges);
          allEarned.push(...levelBadges);
        }
      }
    }
  }

  return allNew;
}
