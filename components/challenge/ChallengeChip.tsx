import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { ThemeContext, getColors } from '../../theme/ThemeContext';

// Same gradient as ChallengeCard
const SELECTED_GRADIENT: [string, string] = ['#00B4DB', '#0083B0'];

interface ChallengeChipProps {
  name: string;
  isSelected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  onLayout?: (e: LayoutChangeEvent) => void;
  showArrows?: boolean;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function ChallengeChip({
  name,
  isSelected,
  onPress,
  onLongPress,
  disabled,
  onLayout,
  showArrows,
  onMoveLeft,
  onMoveRight,
  isFirst,
  isLast,
}: ChallengeChipProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const arrowColor = isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary;
  const disabledArrowColor = isSelected ? 'rgba(255,255,255,0.3)' : colors.border;

  const content = (
    <>
      {showArrows && (
        <TouchableOpacity
          onPress={() => !isFirst && onMoveLeft?.()}
          disabled={isFirst}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          accessibilityLabel="Move challenge left"
          accessibilityRole="button"
        >
          <ChevronLeft
            size={16}
            color={isFirst ? disabledArrowColor : arrowColor}
          />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={150}
        disabled={disabled}
        style={showArrows ? styles.textContainer : undefined}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        <Text
          style={[
            styles.chipText,
            { color: isSelected ? '#fff' : colors.text },
          ]}
          numberOfLines={1}
        >
          {name}
        </Text>
      </TouchableOpacity>
      {showArrows && (
        <TouchableOpacity
          onPress={() => !isLast && onMoveRight?.()}
          disabled={isLast}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          accessibilityLabel="Move challenge right"
          accessibilityRole="button"
        >
          <ChevronRight
            size={16}
            color={isLast ? disabledArrowColor : arrowColor}
          />
        </TouchableOpacity>
      )}
    </>
  );

  if (isSelected) {
    return (
      <LinearGradient
        colors={SELECTED_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.chip,
          showArrows && styles.chipWithArrows,
          disabled && styles.chipDragging,
        ]}
        onLayout={onLayout}
      >
        {content}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.chip,
        showArrows && styles.chipWithArrows,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
        },
        disabled && styles.chipDragging,
      ]}
      onLayout={onLayout}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 8,
  },
  chipWithArrows: {
    paddingHorizontal: 10,
    gap: 4,
  },
  chipDragging: {
    opacity: 0.9,
  },
  textContainer: {
    paddingHorizontal: 4,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
