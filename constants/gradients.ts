import { Challenge } from '../types';

export const CARD_GRADIENTS: [string, string][] = [
  ['#00B4DB', '#0083B0'], // cyan/teal
  ['#667EEA', '#764BA2'], // purple/violet
  ['#F093FB', '#F5576C'], // pink/rose
  ['#4FACFE', '#00F2FE'], // light blue
  ['#43E97B', '#38F9D7'], // green/teal
  ['#FA709A', '#FEE140'], // pink/yellow
  ['#A18CD1', '#FBC2EB'], // lavender/pink
  ['#FF9A9E', '#FECFEF'], // coral/pink
];

export function darkenHex(hex: string, amount: number = 0.2): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const dr = Math.round(r * (1 - amount));
  const dg = Math.round(g * (1 - amount));
  const db = Math.round(b * (1 - amount));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

export function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function getGradientForChallenge(
  challenge: Pick<Challenge, 'themeColor' | 'customThemeColor'>
): [string, string] {
  if (challenge.customThemeColor && isValidHex(challenge.customThemeColor)) {
    return [challenge.customThemeColor, darkenHex(challenge.customThemeColor)];
  }
  const index = challenge.themeColor ?? 0;
  return CARD_GRADIENTS[index % CARD_GRADIENTS.length];
}

export function getGradientForIndex(index: number): [string, string] {
  return CARD_GRADIENTS[index % CARD_GRADIENTS.length];
}
