import { API_URL } from '../config/api';

export type AIConsentPurpose =
  | 'personal_coaching'
  | 'challenge_matching'
  | 'challenge_generation';

export interface AIConsentRecord {
  purpose: AIConsentPurpose;
  granted: boolean;
  policy_version: string;
}

async function request<T>(
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}/api/users?resource=ai-consent`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || 'Unable to update AI consent.');
  }
  return body as T;
}

export async function fetchAIConsents(accessToken: string) {
  const body = await request<{ consents: AIConsentRecord[] }>(accessToken);
  return body.consents || [];
}

export async function updateAIConsent(
  accessToken: string,
  purpose: AIConsentPurpose,
  granted: boolean,
  policyVersion: string
) {
  const body = await request<{ consent: AIConsentRecord }>(accessToken, {
    method: 'POST',
    body: JSON.stringify({
      purpose,
      granted,
      policyVersion,
      ...(granted ? { explicitConsent: true } : {}),
    }),
  });
  return body.consent;
}
