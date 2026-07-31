export interface ChallengeCategory {
  key: string;
  label: string;
  icon: string;
}

export const CHALLENGE_CATEGORIES: ChallengeCategory[] = [
  { key: 'General', label: 'General', icon: 'grid-outline' },
  { key: 'Health', label: 'Physical Wellness', icon: 'heart-outline' },
  { key: 'Discipline', label: 'Discipline', icon: 'shield-checkmark-outline' },
  { key: 'Addiction', label: 'Habit Change', icon: 'refresh-outline' },
  { key: 'Mental Health', label: 'Mindfulness & Stress', icon: 'leaf-outline' },
  { key: 'Lifestyle', label: 'Lifestyle', icon: 'sunny-outline' },
];

export const DEFAULT_CATEGORY = 'General';

export function getCategoryLabel(key: string | undefined): string {
  if (!key) return DEFAULT_CATEGORY;
  return CHALLENGE_CATEGORIES.find(c => c.key === key)?.label ?? DEFAULT_CATEGORY;
}

export function getCategoryIcon(key: string | undefined): string {
  if (!key) return 'grid-outline';
  return CHALLENGE_CATEGORIES.find(c => c.key === key)?.icon ?? 'grid-outline';
}
