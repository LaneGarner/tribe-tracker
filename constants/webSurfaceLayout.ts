export const WEB_SURFACE_GUTTER = 20;

export function insetWebSurfaceWidth(viewportWidth: number, maxWidth: number): number {
  return Math.min(maxWidth, Math.max(0, viewportWidth - WEB_SURFACE_GUTTER * 2));
}
