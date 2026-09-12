import { insetWebSurfaceWidth, WEB_SURFACE_GUTTER } from '../../constants/webSurfaceLayout';

describe('insetWebSurfaceWidth', () => {
  it('keeps a 20px gutter on each side at a 320px viewport', () => {
    expect(WEB_SURFACE_GUTTER).toBe(20);
    expect(insetWebSurfaceWidth(320, 880)).toBe(280);
  });

  it('caps wide surfaces without producing negative widths', () => {
    expect(insetWebSurfaceWidth(1440, 880)).toBe(880);
    expect(insetWebSurfaceWidth(20, 880)).toBe(0);
  });
});
