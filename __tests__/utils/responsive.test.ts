import {
  pageGutterForWidth,
  responsiveSizeForWidth,
} from '../../constants/responsive';

describe('responsive layout tokens', () => {
  it.each([
    [320, 'compact'],
    [599, 'compact'],
    [600, 'medium'],
    [1023, 'medium'],
    [1024, 'wide'],
    [1440, 'wide'],
  ] as const)('maps %ipx to %s', (width, expected) => {
    expect(responsiveSizeForWidth(width)).toBe(expected);
  });

  it('increases page gutters without changing breakpoints', () => {
    expect(pageGutterForWidth(390)).toBe(16);
    expect(pageGutterForWidth(768)).toBe(24);
    expect(pageGutterForWidth(1440)).toBe(32);
  });
});
