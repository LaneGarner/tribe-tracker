import { API_URL } from '../config/api';
import { Challenge } from '../types';
import { getChallengeStatus } from './dateUtils';

export interface MatchChallengeResult {
  challengeId: string;
  reason: string;
  challenge: Challenge;
}

export interface MatchChallengesPayload {
  goals: string[];
  goalSpecifics: Record<string, string[]>;
  startingPoint?: 'fresh' | 'returning' | 'leveling_up';
  challengeStyle?: 'gentle' | 'structured' | 'ambitious';
  desiredHabits?: string[];
}

export async function fetchChallengeMatches(
  token: string,
  payload: MatchChallengesPayload
): Promise<MatchChallengeResult[]> {
  if (!API_URL) return [];

  try {
    const response = await fetch(`${API_URL}/api/match-challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('[matchChallenges] non-ok response', response.status);
      return [];
    }

    const data = (await response.json()) as { matches?: MatchChallengeResult[] };
    return Array.isArray(data.matches) ? data.matches : [];
  } catch (err) {
    console.warn('[matchChallenges] request failed', err);
    return [];
  }
}

/** Existing challenges are available to Free members without a model call or AI consent. */
export function matchExistingChallenges(
  challenges: Challenge[], payload: MatchChallengesPayload, joinedIds: Set<string> = new Set()
): MatchChallengeResult[] {
  const terms = [...(payload.desiredHabits || []), ...Object.values(payload.goalSpecifics).flat()]
    .map(term => term.trim().toLowerCase()).filter(Boolean);
  const seen = new Set<string>();
  return challenges.filter(challenge => {
    if (seen.has(challenge.id) || !challenge.isPublic || joinedIds.has(challenge.id) || challenge.status === 'completed') return false;
    seen.add(challenge.id);
    return getChallengeStatus(challenge.startDate, challenge.endDate || challenge.startDate, challenge) !== 'completed';
  }).map(challenge => {
    const categoryMatch = payload.goals.includes(challenge.category || 'General');
    const text = [challenge.name, challenge.description || '', ...challenge.habits].join(' ').toLowerCase();
    const habitMatches = terms.filter(term => text.includes(term)).length;
    return { challenge, score: (categoryMatch ? 100 : 0) + habitMatches * 10, categoryMatch, habitMatches };
  }).sort((a, b) => b.score - a.score || b.challenge.participantCount - a.challenge.participantCount || a.challenge.name.localeCompare(b.challenge.name))
    .slice(0, 6).map(({ challenge, categoryMatch, habitMatches }) => ({
      challengeId: challenge.id, challenge,
      reason: categoryMatch ? 'Matches one of your goals' : habitMatches ? 'Includes habits you’re interested in' : 'An existing challenge you can join for free',
    }));
}

export async function findOnboardingChallenges(
  token: string | null,
  payload: MatchChallengesPayload,
  options: {
    canUseAI: boolean;
    ensureAIConsent: () => Promise<boolean>;
    cachedChallenges: Challenge[];
    joinedIds: Set<string>;
  }
): Promise<MatchChallengeResult[]> {
  if (token && options.canUseAI) {
    try {
      if (await options.ensureAIConsent()) {
        const matches = await fetchChallengeMatches(token, payload);
        if (matches.length) return matches;
      }
    } catch {
      // Consent or model failures must never block the free onboarding path.
    }
  }
  let challenges = options.cachedChallenges;
  if (token && API_URL) {
    try {
      const response = await fetch(`${API_URL}/api/challenges?isPublic=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const body = await response.json();
        if (Array.isArray(body.challenges)) challenges = body.challenges;
      }
    } catch {
      // Keep locally available challenges usable when the network is unavailable.
    }
  }
  return matchExistingChallenges(challenges, payload, options.joinedIds);
}
