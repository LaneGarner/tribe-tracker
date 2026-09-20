export const WEB_SURFACE_GUTTER = 20;
export const WEB_SURFACE_WIDTH = `calc(100% - ${WEB_SURFACE_GUTTER * 2}px)`;

export function insetWebSurfaceWidth(parentWidth: number, maxWidth: number): number {
  return Math.min(maxWidth, Math.max(0, parentWidth - WEB_SURFACE_GUTTER * 2));
}
