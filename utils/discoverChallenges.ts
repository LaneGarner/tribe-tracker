import { Challenge } from '../types';
import { getChallengeStatus } from './dateUtils';

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
