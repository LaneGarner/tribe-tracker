import { shouldUseAccessibleReorderControls } from '../../constants/reorderBehavior';

describe('shouldUseAccessibleReorderControls', () => {
  it('always exposes discrete reorder controls on web', () => {
    expect(shouldUseAccessibleReorderControls('web', false, true)).toBe(true);
  });

  it('retains native drag behavior when available', () => {
    expect(shouldUseAccessibleReorderControls('ios', false, true)).toBe(false);
    expect(shouldUseAccessibleReorderControls('android', false, true)).toBe(false);
  });

  it('uses discrete controls when native drag is unavailable', () => {
    expect(shouldUseAccessibleReorderControls('ios', true, true)).toBe(true);
    expect(shouldUseAccessibleReorderControls('android', false, false)).toBe(true);
  });
});
