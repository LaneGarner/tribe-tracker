import { getDiscoverChallengeSections, discoverCategoryKey, rankDiscoverChallenges, buildDiscoverRows } from '../../utils/discoverChallenges';
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

it('ranks active challenges by participation without mutating the full category list', () => {
  const list = Array.from({ length: 8 }, (_, i) => challenge(String(i), { participantCount: i }));
  const ranked = rankDiscoverChallenges(list);
  expect(ranked.slice(0, 3).map(c => c.id)).toEqual(['7', '6', '5']);
  expect(ranked).toHaveLength(8);
  expect(list[0].id).toBe('0');
});

it('prioritizes nearest upcoming starts before popularity and keeps all results available', () => {
  const list = Array.from({ length: 8 }, (_, i) => challenge(String(i), {
    startDate: `2026-11-${String(i + 1).padStart(2, '0')}`, participantCount: i,
  }));
  const ranked = rankDiscoverChallenges(list, true);
  expect(ranked.slice(0, 6).map(c => c.id)).toEqual(['0', '1', '2', '3', '4', '5']);
  expect(ranked).toHaveLength(8);
});

it('maps legacy and missing categories to General consistently', () => {
  expect(discoverCategoryKey(challenge('unknown', { category: 'Unknown' }))).toBe('General');
  expect(discoverCategoryKey(challenge('missing'))).toBe('General');
  expect(discoverCategoryKey(challenge('health', { category: 'Health' }))).toBe('Health');
});

it('keeps every upcoming challenge and the same active previews in virtualized browsing', () => {
  const upcoming = Array.from({ length: 20 }, (_, i) => challenge(`up-${i}`));
  const active = Array.from({ length: 12 }, (_, i) => challenge(`active-${i}`, { category: 'Health', participantCount: i }));
  const rows = buildDiscoverRows(active, upcoming, true);
  expect(rows.filter(row => row.kind === 'challenge')).toHaveLength(23);
  expect(rows.filter(row => row.kind === 'showAll')).toHaveLength(1);
  expect(rows[0].kind).toBe('sticky');
  expect(buildDiscoverRows(active, upcoming, false).map(row => row.kind)).toEqual(['sticky', 'intro', 'loading']);
});
