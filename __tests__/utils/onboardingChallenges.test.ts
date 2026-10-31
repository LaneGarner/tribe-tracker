jest.mock('../../config/api', () => ({ API_URL: 'https://test-api.example' }));
import { findOnboardingChallenges, matchExistingChallenges } from '../../utils/matchChallenges';
import type { Challenge } from '../../types';

const challenge = (id: string, extra: Partial<Challenge> = {}): Challenge => ({
  id, name: id, creatorId: 'creator', habits: ['Walk'], durationDays: 30,
  startDate: '2026-10-20', endDate: '2026-11-19', status: 'active',
  isPublic: true, participantCount: 1, ...extra,
});
const payload = { goals: ['Health'], goalSpecifics: {}, desiredHabits: ['Walk'] };
const ensureAIConsent = jest.fn(async () => true);
const options = () => ({ canUseAI: false, ensureAIConsent, cachedChallenges: [], joinedIds: new Set<string>() });

beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-31T12:00:00Z'));
  jest.clearAllMocks(); global.fetch = jest.fn();
});
afterEach(() => jest.useRealTimers());

it('gives Free users existing challenges without consent, a paywall, or an AI request', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ challenges: [challenge('walk')] }) });
  const result = await findOnboardingChallenges('token', payload, options());
  expect(result.map(m => m.challengeId)).toEqual(['walk']);
  expect(ensureAIConsent).not.toHaveBeenCalled();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith('https://test-api.example/api/challenges?isPublic=true', expect.anything());
});
it('falls back to existing challenges when Pro users decline AI consent', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ challenges: [challenge('walk')] }) });
  const result = await findOnboardingChallenges('token', payload, { ...options(), canUseAI: true, ensureAIConsent: async () => false });
  expect(result).toHaveLength(1);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
it('falls back when the AI endpoint rejects access after membership changes', async () => {
  (global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: false, status: 402 })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ challenges: [challenge('walk')] }) });
  expect(await findOnboardingChallenges('token', payload, { ...options(), canUseAI: true })).toHaveLength(1);
});
it('uses cached existing challenges when offline', async () => {
  (global.fetch as jest.Mock).mockRejectedValue(new Error('Offline'));
  expect(await findOnboardingChallenges('token', payload, { ...options(), cachedChallenges: [challenge('cached')] })).toHaveLength(1);
});
it('filters private, joined, duplicate, ended and manually completed challenges and ranks goals first', () => {
  const result = matchExistingChallenges([
    challenge('popular', { participantCount: 100 }),
    challenge('goal', { category: 'Health' }),
    challenge('private', { isPublic: false }), challenge('joined'),
    challenge('ended', { startDate: '2026-08-01', endDate: '2026-08-31' }),
    challenge('manual', { status: 'completed', isOngoing: true }),
    challenge('goal', { category: 'Health' }),
  ], payload, new Set(['joined']));
  expect(result.map(m => m.challengeId)).toEqual(['goal', 'popular']);
});
it('allows empty results to advance without creating paid content', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ challenges: [] }) });
  expect(await findOnboardingChallenges('token', payload, options())).toEqual([]);
});

it('retains AI matching for consenting Pro accounts', async () => {
  const matches = [{ challengeId: 'ai-match', reason: 'Fits your goals', challenge: challenge('ai-match') }];
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ matches }) });
  expect(await findOnboardingChallenges('token', payload, { ...options(), canUseAI: true })).toEqual(matches);
  expect(ensureAIConsent).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
