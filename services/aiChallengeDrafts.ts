import { API_URL } from '../config/api';

export interface AIChallengeDraft {
  name: string;
  description?: string;
  durationDays: number;
  habits: string[];
  category?: string;
}

export class AIChallengeDraftError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'unavailable'
      | 'pro_required'
      | 'ai_consent_required'
      | 'request_failed'
  ) {
    super(message);
    this.name = 'AIChallengeDraftError';
  }
}

export async function generateAIChallengeDraft(
  accessToken: string,
  prompt: string
): Promise<AIChallengeDraft> {
  const response = await fetch(`${API_URL}/api/match-challenges?action=draft`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: prompt.trim() }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      response.status === 404 || response.status === 405
        ? 'unavailable'
        : response.status === 402 || body?.code === 'pro_required'
          ? 'pro_required'
          : response.status === 403 || body?.code === 'ai_consent_required'
            ? 'ai_consent_required'
            : 'request_failed';
    throw new AIChallengeDraftError(
      body?.error ||
        (code === 'unavailable'
          ? 'AI challenge drafting is not available in this build yet.'
          : 'Unable to create a challenge draft right now.'),
      code
    );
  }

  const draft = body?.draft;
  if (
    !draft ||
    typeof draft.name !== 'string' ||
    !Array.isArray(draft.habits) ||
    !draft.habits.every((habit: unknown) => typeof habit === 'string')
  ) {
    throw new AIChallengeDraftError(
      'The draft response was incomplete. Please try again.',
      'request_failed'
    );
  }
  return {
    name: draft.name.trim().slice(0, 160),
    description:
      typeof draft.description === 'string'
        ? draft.description.trim().slice(0, 2000)
        : undefined,
    durationDays: Math.min(
      Math.max(Number(draft.durationDays) || 30, 1),
      365
    ),
    habits: draft.habits
      .map((habit: string) => habit.trim())
      .filter(Boolean)
      .slice(0, 15),
    category:
      typeof draft.category === 'string' ? draft.category : undefined,
  };
}
