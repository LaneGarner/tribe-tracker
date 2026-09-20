export function shouldUseAccessibleReorderControls(
  platform: string,
  isExpoGo: boolean,
  dragListAvailable: boolean
): boolean {
  return platform === 'web' || isExpoGo || !dragListAvailable;
}
