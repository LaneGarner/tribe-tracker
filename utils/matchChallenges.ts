import { API_URL } from '../config/api';
import { Challenge } from '../types';

export interface MatchChallengeResult {
  challengeId: string;
  reason: string;
  challenge: Challenge;
}

export interface MatchChallengesPayload {
  goals: string[];
  goalSpecifics: Record<string, string[]>;
  goalDaysPerWeek: number;
  goalNotes: string;
  chatTurn: string;
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
