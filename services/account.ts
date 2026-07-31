import { API_URL } from '../config/api';

export class RecentAuthenticationRequiredError extends Error {
  constructor() {
    super('Please sign in again before deleting your account.');
    this.name = 'RecentAuthenticationRequiredError';
  }
}

export async function deleteAccount(accessToken: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/users?resource=account`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (
      body?.code === 'recent_auth_required' ||
      body?.code === 'reauthentication_required'
    ) {
      throw new RecentAuthenticationRequiredError();
    }
    const message =
      body && typeof body.error === 'string'
        ? body.error
        : 'Account deletion is temporarily unavailable.';
    throw new Error(message);
  }
}
