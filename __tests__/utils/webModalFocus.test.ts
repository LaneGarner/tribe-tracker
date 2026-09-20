import { trappedFocusIndex } from '../../hooks/useWebModalFocus';

describe('trappedFocusIndex', () => {
  it('wraps forward and backward within a modal', () => {
    expect(trappedFocusIndex(2, 3, false)).toBe(0);
    expect(trappedFocusIndex(0, 3, true)).toBe(2);
  });

  it('handles an empty modal', () => {
    expect(trappedFocusIndex(0, 0, false)).toBe(-1);
  });
});
