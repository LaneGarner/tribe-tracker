import { webTabPlacementForWidth } from '../../navigation/webNavigationLayout';

describe('web navigation placement', () => {
  it('keeps bottom navigation on compact and medium screens', () => {
    expect(webTabPlacementForWidth(320)).toBe('bottom');
    expect(webTabPlacementForWidth(768)).toBe('bottom');
    expect(webTabPlacementForWidth(1023)).toBe('bottom');
  });

  it('switches to the desktop sidebar at 1024px', () => {
    expect(webTabPlacementForWidth(1024)).toBe('left');
    expect(webTabPlacementForWidth(1440)).toBe('left');
  });
});
