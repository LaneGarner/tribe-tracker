import { shouldReduceWebMotion } from '../../hooks/useReducedMotion';

describe('shouldReduceWebMotion', () => {
  it('honors the preference on web', () => {
    expect(shouldReduceWebMotion('web', true)).toBe(true);
    expect(shouldReduceWebMotion('web', false)).toBe(false);
  });

  it('does not alter established native animation behavior', () => {
    expect(shouldReduceWebMotion('ios', true)).toBe(false);
    expect(shouldReduceWebMotion('android', true)).toBe(false);
  });
});
