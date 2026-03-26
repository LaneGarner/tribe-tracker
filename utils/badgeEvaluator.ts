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
  podiumResults: { challengeId: string; rank: number }[];
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

  // Calculate podium results for completed challenges
  const podiumResults: { challengeId: string; rank: number }[] = [];
  let totalWins = 0;

  for (const challenge of completedChallenges) {
    const participants = state.participants.data
      .filter(p => p.challengeId === challenge.id)
      .sort((a, b) => b.totalPoints - a.totalPoints);

    const userIndex = participants.findIndex(p => p.userId === userId);
    if (userIndex !== -1) {
      const userPoints = participants[userIndex].totalPoints;
      const rank = participants.filter(p => p.totalPoints > userPoints).length + 1;
      podiumResults.push({ challengeId: challenge.id, rank });
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
    podiumResults,
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

// Map slug to what stat it checks, since requirementType is generic ("event"/"count")
function getStatForSlug(slug: string): 'checkin' | 'challenge_join' | 'challenge_create' | 'challenge_public' | 'challenge_complete' | 'wins' | 'profile' | 'invite' | null {
  if (slug === 'first_checkin' || slug === 'getting_started' || slug === 'building_habit' || slug.startsWith('checkins_')) return 'checkin';
  if (slug === 'first_challenge' || slug === 'challenges_5' || slug === 'challenges_10') return 'challenge_join';
  if (slug === 'create_challenge') return 'challenge_create';
  if (slug === 'public_challenge') return 'challenge_public';
  if (slug === 'challenge_complete') return 'challenge_complete';
  if (slug === 'wins_3') return 'wins';
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

  if (isAlreadyEarned(earned, def.id)) {
    // For non-challenge-scoped badges, skip if already earned
    if (requirementType !== 'placement') return newBadges;
  }

  switch (requirementType) {
    case 'streak':
      if (stats.maxLongestStreak >= value && !isAlreadyEarned(earned, def.id)) {
        newBadges.push(makeBadge());
      }
      break;

    case 'placement':
      // value = max rank (1 for gold, 2 for silver, 3 for bronze)
      for (const result of stats.podiumResults) {
        if (
          result.rank <= value &&
          !isAlreadyEarned(earned, def.id, result.challengeId)
        ) {
          newBadges.push(makeBadge(result.challengeId));
        }
      }
      break;

    case 'level':
      if (stats.level >= value && !isAlreadyEarned(earned, def.id)) {
        newBadges.push(makeBadge());
      }
      break;

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

      if (met && !isAlreadyEarned(earned, def.id)) {
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
