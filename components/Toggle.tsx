import React, { useContext, useEffect, useRef } from 'react';
import { StyleSheet, Pressable, Animated } from 'react-native';
import { ThemeContext, getColors } from '../theme/ThemeContext';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  variant?: 'primary' | 'warning';
  accessibilityLabel?: string;
}

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 24;
const THUMB_SIZE = 20;
const THUMB_OFFSET = 2;

export default function Toggle({
  value,
  onValueChange,
  disabled = false,
  variant = 'primary',
  accessibilityLabel,
}: ToggleProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const animation = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animation, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 50,
    }).start();
  }, [value, animation]);

  const activeColor = variant === 'warning' ? colors.warning : colors.primary;

  const trackBackgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceSecondary, activeColor],
  });

  const thumbTranslateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRACK_WIDTH - THUMB_SIZE - THUMB_OFFSET * 2],
  });

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[
          styles.track,
          { backgroundColor: trackBackgroundColor },
          disabled && styles.trackDisabled,
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            { transform: [{ translateX: thumbTranslateX }] },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: THUMB_OFFSET,
    justifyContent: 'center',
  },
  trackDisabled: {
    opacity: 0.5,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
  },
});
