export const RESPONSIVE_BREAKPOINTS = {
  compact: 600,
  wide: 1024,
} as const;

export type ResponsiveSize = 'compact' | 'medium' | 'wide';

export function responsiveSizeForWidth(width: number): ResponsiveSize {
  if (width < RESPONSIVE_BREAKPOINTS.compact) return 'compact';
  if (width < RESPONSIVE_BREAKPOINTS.wide) return 'medium';
  return 'wide';
}

export function pageGutterForWidth(width: number): number {
  const size = responsiveSizeForWidth(width);
  return size === 'compact' ? 16 : size === 'medium' ? 24 : 32;
}
