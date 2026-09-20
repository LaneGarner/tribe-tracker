import { RESPONSIVE_BREAKPOINTS } from '../constants/responsive';

export type WebTabPlacement = 'bottom' | 'left';

export function webTabPlacementForWidth(width: number): WebTabPlacement {
  return width >= RESPONSIVE_BREAKPOINTS.wide ? 'left' : 'bottom';
}
