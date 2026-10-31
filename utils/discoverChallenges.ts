import { Challenge } from '../types';
import { CHALLENGE_CATEGORIES, DEFAULT_CATEGORY } from '../constants/categories';
import { getChallengeStatus, getRecurringCycleInfo } from './dateUtils';

export function getDiscoverChallengeSections(challenges: Challenge[], joinedIds: Set<string>) {
  const active: Challenge[] = [];
  const upcoming: Challenge[] = [];
  const seen = new Set<string>();
  for (const challenge of challenges) {
    if (seen.has(challenge.id) || challenge.status === 'completed') continue;
    seen.add(challenge.id);
    const status = getChallengeStatus(challenge.startDate, challenge.endDate || challenge.startDate, challenge);
    if (status === 'active' && challenge.isPublic) active.push(challenge);
    if (['upcoming', 'gap'].includes(status) && (challenge.isPublic || joinedIds.has(challenge.id))) {
      upcoming.push(challenge);
    }
  }
  upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return { active, upcoming };
}

export function discoverCategoryKey(challenge: Challenge): string {
  return CHALLENGE_CATEGORIES.some(category => category.key === challenge.category)
    ? challenge.category! : DEFAULT_CATEGORY;
}

export function rankDiscoverChallenges(challenges: Challenge[], upcoming = false): Challenge[] {
  return [...challenges].sort((a, b) => {
    if (upcoming) {
      const startA = getRecurringCycleInfo(a)?.cycleStartDate || a.startDate;
      const startB = getRecurringCycleInfo(b)?.cycleStartDate || b.startDate;
      const dateOrder = startA.localeCompare(startB);
      if (dateOrder) return dateOrder;
    }
    return (b.participantCount || 0) - (a.participantCount || 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
}

export type DiscoverListRow =
  | { key: string; kind: 'sticky' | 'intro' | 'loading' | 'upcoming' | 'active' | 'empty' }
  | { key: string; kind: 'category' | 'showAll'; category: typeof CHALLENGE_CATEGORIES[number] }
  | { key: string; kind: 'challenge'; challenge: Challenge; index: number };

export function buildDiscoverRows(active: Challenge[], upcoming: Challenge[], ready: boolean): DiscoverListRow[] {
  const rows: DiscoverListRow[] = [{ key: 'sticky', kind: 'sticky' }, { key: 'intro', kind: 'intro' }];
  if (!ready) return [...rows, { key: 'loading', kind: 'loading' }];
  let index = 0;
  if (upcoming.length) {
    rows.push({ key: 'upcoming', kind: 'upcoming' });
    for (const challenge of rankDiscoverChallenges(upcoming, true)) rows.push({ key: `upcoming:${challenge.id}`, kind: 'challenge', challenge, index: index++ });
  }
  rows.push({ key: 'active', kind: 'active' });
  if (!active.length) rows.push({ key: 'empty', kind: 'empty' });
  for (const category of CHALLENGE_CATEGORIES) {
    const candidates = active.filter(challenge => discoverCategoryKey(challenge) === category.key);
    if (!candidates.length) continue;
    rows.push({ key: `category:${category.key}`, kind: 'category', category });
    for (const challenge of rankDiscoverChallenges(candidates).slice(0, 3)) rows.push({ key: `active:${challenge.id}`, kind: 'challenge', challenge, index: index++ });
    rows.push({ key: `all:${category.key}`, kind: 'showAll', category });
  }
  return rows;
}
