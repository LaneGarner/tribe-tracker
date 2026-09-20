export interface ProgressLayout {
  contentMaxWidth: number;
  badgeColumns: number;
  statCardWidth: `${number}%`;
}

export function progressLayoutForWidth(width: number): ProgressLayout {
  if (width >= 1200) {
    return { contentMaxWidth: 1120, badgeColumns: 5, statCardWidth: '23.5%' };
  }
  if (width >= 768) {
    return { contentMaxWidth: 920, badgeColumns: 4, statCardWidth: '47%' };
  }
  return { contentMaxWidth: 640, badgeColumns: 3, statCardWidth: '47%' };
}
