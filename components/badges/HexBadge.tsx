import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { BadgeDefinition } from '../../types';

interface HexBadgeProps {
  badge: BadgeDefinition;
  earned: boolean;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  earnedDate?: string;
  onPress?: () => void;
}

const SIZES = {
  sm: { hex: 56, icon: 22, fontSize: 10, nameWidth: 64, frameWidth: 4 },
  md: { hex: 80, icon: 34, fontSize: 12, nameWidth: 88, frameWidth: 5 },
  lg: { hex: 120, icon: 50, fontSize: 14, nameWidth: 130, frameWidth: 7 },
};

// Generate hexagon points for SVG (flat-topped hexagon like Garmin)
function getHexPoints(size: number, inset: number = 0): string {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - inset;
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    // Start from top vertex (-90 degrees) for flat-top hexagon
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

export default function HexBadge({
  badge,
  earned,
  size = 'md',
  showName = true,
  earnedDate,
  onPress,
}: HexBadgeProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const dim = SIZES[size];
  const uniqueId = `badge-${badge.id}-${size}`;
  const [imageError, setImageError] = useState(false);

  // Check if we should use the image (has URL, no error loading)
  const useImage = badge.imageUrl && !imageError;

  // Full color for all badges
  const gradientStart = badge.iconColor;
  const gradientEnd = badge.iconColorEnd || badge.iconColor;

  // Metallic frame colors - silver/chrome
  const frameHighlight = '#F0F0F0';
  const frameMid = '#C0C0C0';
  const frameShadow = '#909090';
  const frameEdge = '#707070';

  const iconColor = '#FFFFFF';
  const glowColor = earned ? badge.borderColor : 'transparent';

  // Render badge with custom image (no clipping - image has its own hexagon shape)
  // Scale up to compensate for transparent padding in the images
  const imageScale = 1.35;
  const renderImageBadge = () => (
    <View
      style={[
        styles.hexContainer,
        { width: dim.hex, height: dim.hex, overflow: 'visible' },
        earned && {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 12,
        },
      ]}
    >
      <Image
        source={{ uri: badge.imageUrl }}
        style={{ width: dim.hex * imageScale, height: dim.hex * imageScale }}
        contentFit="contain"
        transition={200}
        cachePolicy="disk"
        onError={() => setImageError(true)}
      />
    </View>
  );

  // Render badge with icon fallback
  const renderIconBadge = () => (
    <View
      style={[
        styles.hexContainer,
        { width: dim.hex, height: dim.hex },
        earned && {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 12,
        },
      ]}
    >
      <Svg width={dim.hex} height={dim.hex} viewBox={`0 0 ${dim.hex} ${dim.hex}`}>
        <Defs>
          {/* Metallic frame gradient - top-left to bottom-right for 3D bevel */}
          <LinearGradient id={`${uniqueId}-frame`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={frameHighlight} />
            <Stop offset="30%" stopColor={frameMid} />
            <Stop offset="70%" stopColor={frameShadow} />
            <Stop offset="100%" stopColor={frameEdge} />
          </LinearGradient>

          {/* Inner frame highlight for bevel effect */}
          <LinearGradient id={`${uniqueId}-frame-inner`} x1="100%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor={frameHighlight} />
            <Stop offset="50%" stopColor={frameMid} />
            <Stop offset="100%" stopColor={frameShadow} />
          </LinearGradient>

          {/* Badge fill gradient */}
          <LinearGradient id={`${uniqueId}-fill`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradientStart} />
            <Stop offset="100%" stopColor={gradientEnd} />
          </LinearGradient>

          {/* Dark inner background for depth */}
          <LinearGradient id={`${uniqueId}-inner-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#3A3A3A" />
            <Stop offset="100%" stopColor="#1A1A1A" />
          </LinearGradient>
        </Defs>

        {/* Outer shadow/edge */}
        <Polygon
          points={getHexPoints(dim.hex, 0)}
          fill={frameEdge}
        />

        {/* Main metallic frame */}
        <Polygon
          points={getHexPoints(dim.hex, 1)}
          fill={`url(#${uniqueId}-frame)`}
        />

        {/* Inner bevel highlight */}
        <Polygon
          points={getHexPoints(dim.hex, dim.frameWidth - 1)}
          fill={`url(#${uniqueId}-frame-inner)`}
        />

        {/* Dark inner background */}
        <Polygon
          points={getHexPoints(dim.hex, dim.frameWidth + 1)}
          fill={`url(#${uniqueId}-inner-bg)`}
        />

        {/* Colored fill area */}
        <Polygon
          points={getHexPoints(dim.hex, dim.frameWidth + 2)}
          fill={`url(#${uniqueId}-fill)`}
        />
      </Svg>

      {/* Icon overlay */}
      <View style={styles.iconContainer}>
        <Ionicons
          name={(badge.iconName || 'star') as keyof typeof Ionicons.glyphMap}
          size={dim.icon}
          color={iconColor}
          style={styles.iconShadow}
        />
      </View>
    </View>
  );

  const content = (
    <View style={styles.container}>
      {useImage ? renderImageBadge() : renderIconBadge()}

      {/* Badge name */}
      {showName && (
        <View style={{ width: dim.nameWidth }}>
          <Text
            style={[
              styles.badgeName,
              {
                color: colors.text,
                fontSize: dim.fontSize,
              },
            ]}
            numberOfLines={2}
          >
            {badge.name}
          </Text>
          {earnedDate && earned && (
            <Text
              style={[
                styles.earnedDate,
                { color: colors.textTertiary, fontSize: dim.fontSize - 2 },
              ]}
            >
              {earnedDate}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  hexContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  badgeName: {
    textAlign: 'center',
    fontWeight: '600',
  },
  earnedDate: {
    textAlign: 'center',
    marginTop: 2,
  },
});
