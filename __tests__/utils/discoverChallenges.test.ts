import { getDiscoverChallengeSections } from '../../utils/discoverChallenges';
import { Challenge } from '../../types';

const challenge = (id: string, overrides: Partial<Challenge> = {}): Challenge => ({
  id, name: id, creatorId: 'creator', durationDays: 7,
  startDate: '2026-11-02', endDate: '2026-11-08', habits: ['Walk'],
  isPublic: true, status: 'upcoming', participantCount: 0, ...overrides,
});

beforeAll(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-31T12:00:00Z')); });
afterAll(() => jest.useRealTimers());

it('shows public and joined private upcoming challenges without revealing other private challenges', () => {
  const challenges = [challenge('public'), challenge('joined-private', { isPublic: false }),
    challenge('unjoined-private', { isPublic: false }), challenge('joined-private', { isPublic: false })];
  const { upcoming } = getDiscoverChallengeSections(challenges, new Set(['joined-private']));
  expect(upcoming.map(c => c.id)).toEqual(['public', 'joined-private']);
});

it('excludes completed challenges including manually ended ongoing challenges', () => {
  const { active, upcoming } = getDiscoverChallengeSections([
    challenge('ended', { startDate: '2026-09-01', endDate: '2026-09-07' }),
    challenge('manual', { startDate: '2026-10-01', isOngoing: true, status: 'completed' }),
  ], new Set(['ended', 'manual']));
  expect(active).toEqual([]);
  expect(upcoming).toEqual([]);
});

it('keeps active browsing public and orders upcoming challenges by start date', () => {
  const { active, upcoming } = getDiscoverChallengeSections([
    challenge('later', { startDate: '2026-11-10' }), challenge('sooner'),
    challenge('active', { startDate: '2026-10-30', endDate: '2026-11-05' }),
    challenge('private-active', { startDate: '2026-10-30', isPublic: false }),
  ], new Set(['private-active']));
  expect(active.map(c => c.id)).toEqual(['active']);
  expect(upcoming.map(c => c.id)).toEqual(['sooner', 'later']);
});
