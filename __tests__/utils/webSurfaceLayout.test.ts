import { insetWebSurfaceWidth, WEB_SURFACE_GUTTER, WEB_SURFACE_WIDTH } from '../../constants/webSurfaceLayout';

describe('insetWebSurfaceWidth', () => {
  it('keeps a 20px gutter on each side at a 320px viewport', () => {
    expect(WEB_SURFACE_GUTTER).toBe(20);
    expect(WEB_SURFACE_WIDTH).toBe('calc(100% - 40px)');
    expect(insetWebSurfaceWidth(320, 880)).toBe(280);
  });

  it('caps wide surfaces without producing negative widths', () => {
    expect(insetWebSurfaceWidth(1440, 880)).toBe(880);
    expect(insetWebSurfaceWidth(20, 880)).toBe(0);
  });

  it.each([1024, 1080, 1159])('uses desktop scene width rather than viewport width at %ipx', viewportWidth => {
    const parentWidth = viewportWidth - 240;
    expect(insetWebSurfaceWidth(parentWidth, 880)).toBe(parentWidth - 40);
    expect(insetWebSurfaceWidth(parentWidth, 880)).toBeLessThanOrEqual(parentWidth);
  });
});
