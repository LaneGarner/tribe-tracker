import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { getLevelTitle } from '../../redux/slices/badgesSlice';

interface LevelBadgeProps {
  level: number;
  totalPoints: number;
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
  showPoints?: boolean;
}

const SIZES = {
  sm: { hex: 40, fontSize: 16, titleSize: 10, frameWidth: 3 },
  md: { hex: 56, fontSize: 22, titleSize: 12, frameWidth: 4 },
  lg: { hex: 80, fontSize: 32, titleSize: 14, frameWidth: 5 },
};

// Level gradient colors (bronze to diamond progression)
const LEVEL_COLORS: Record<number, { start: string; end: string; glow: string }> = {
  1: { start: '#CD7F32', end: '#8B4513', glow: '#CD7F32' }, // Bronze
  2: { start: '#D4D4D4', end: '#A0A0A0', glow: '#C0C0C0' }, // Silver
  3: { start: '#FFD700', end: '#DAA520', glow: '#FFD700' }, // Gold
  4: { start: '#50C878', end: '#228B22', glow: '#50C878' }, // Emerald
  5: { start: '#4FC3F7', end: '#0288D1', glow: '#4FC3F7' }, // Sapphire
  6: { start: '#BA68C8', end: '#7B1FA2', glow: '#BA68C8' }, // Amethyst
  7: { start: '#00E5FF', end: '#00B8D4', glow: '#00E5FF' }, // Diamond
};

function getLevelColors(level: number) {
  return LEVEL_COLORS[Math.min(level, 7)] || LEVEL_COLORS[7];
}

// Generate hexagon points for SVG (flat-topped hexagon)
function getHexPoints(size: number, inset: number = 0): string {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - inset;
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

export default function LevelBadge({
  level,
  totalPoints,
  size = 'md',
  showTitle = true,
  showPoints = false,
}: LevelBadgeProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const dim = SIZES[size];
  const levelColors = getLevelColors(level);
  const title = getLevelTitle(level);
  const uniqueId = `level-${level}-${size}`;

  // Metallic frame colors
  const frameHighlight = '#E8E8E8';
  const frameMid = '#B0B0B0';
  const frameShadow = '#808080';
  const frameEdge = '#606060';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.hexContainer,
          {
            width: dim.hex,
            height: dim.hex,
            shadowColor: levelColors.glow,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 10,
          },
        ]}
      >
        <Svg width={dim.hex} height={dim.hex} viewBox={`0 0 ${dim.hex} ${dim.hex}`}>
          <Defs>
            {/* Metallic frame gradient */}
            <LinearGradient id={`${uniqueId}-frame`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={frameHighlight} />
              <Stop offset="30%" stopColor={frameMid} />
              <Stop offset="70%" stopColor={frameShadow} />
              <Stop offset="100%" stopColor={frameEdge} />
            </LinearGradient>

            {/* Inner bevel */}
            <LinearGradient id={`${uniqueId}-bevel`} x1="100%" y1="100%" x2="0%" y2="0%">
              <Stop offset="0%" stopColor={frameHighlight} />
              <Stop offset="50%" stopColor={frameMid} />
              <Stop offset="100%" stopColor={frameShadow} />
            </LinearGradient>

            {/* Level color gradient */}
            <LinearGradient id={`${uniqueId}-fill`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={levelColors.start} />
              <Stop offset="100%" stopColor={levelColors.end} />
            </LinearGradient>

            {/* Dark background */}
            <LinearGradient id={`${uniqueId}-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#3A3A3A" />
              <Stop offset="100%" stopColor="#1A1A1A" />
            </LinearGradient>
          </Defs>

          {/* Outer edge */}
          <Polygon points={getHexPoints(dim.hex, 0)} fill={frameEdge} />

          {/* Main metallic frame */}
          <Polygon points={getHexPoints(dim.hex, 1)} fill={`url(#${uniqueId}-frame)`} />

          {/* Inner bevel */}
          <Polygon points={getHexPoints(dim.hex, dim.frameWidth - 1)} fill={`url(#${uniqueId}-bevel)`} />

          {/* Dark background */}
          <Polygon points={getHexPoints(dim.hex, dim.frameWidth + 1)} fill={`url(#${uniqueId}-bg)`} />

          {/* Level color fill */}
          <Polygon points={getHexPoints(dim.hex, dim.frameWidth + 2)} fill={`url(#${uniqueId}-fill)`} />
        </Svg>

        {/* Level number overlay */}
        <Text style={[styles.levelText, { fontSize: dim.fontSize }]}>{level}</Text>
      </View>

      {showTitle && (
        <Text style={[styles.titleText, { color: colors.text, fontSize: dim.titleSize }]}>
          {title}
        </Text>
      )}
      {showPoints && (
        <Text style={[styles.pointsText, { color: colors.textSecondary, fontSize: dim.titleSize - 2 }]}>
          {totalPoints} pts
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  hexContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelText: {
    position: 'absolute',
    color: '#FFFFFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleText: {
    marginTop: 6,
    fontWeight: '600',
  },
  pointsText: {
    marginTop: 2,
  },
});
