import { API_URL } from '../config/api';
import { Challenge } from '../types';

export class ChallengeCreationError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ChallengeCreationError';
  }
}

export async function createChallengeOnServer(
  challenge: Challenge,
  accessToken: string
): Promise<Challenge> {
  const response = await fetch(`${API_URL}/api/challenges`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ challenge }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ChallengeCreationError(
      body?.error || 'The challenge could not be created.',
      body?.code
    );
  }
  if (!body?.challenge) {
    throw new ChallengeCreationError('The server returned an invalid challenge.');
  }
  return body.challenge as Challenge;
}
