import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import Avatar from '../Avatar';
import { TypingUser } from '../../hooks/useTypingIndicator';

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  isGroupChat?: boolean;
}

function AnimatedDot({ delay, reducedMotion }: { delay: number; reducedMotion: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      anim.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        // Pad remaining time so total cycle = 1200ms for all dots
        Animated.delay(1200 - delay - 800),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay, reducedMotion]);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        { opacity, transform: [{ scale }] },
      ]}
    />
  );
}

export default function TypingIndicator({ typingUsers, isGroupChat = false }: TypingIndicatorProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      reducedMotionRef.current = enabled;
    });
  }, []);

  if (typingUsers.length === 0) return null;

  const firstUser = typingUsers[0];
  const label =
    typingUsers.length === 1
      ? `${firstUser.userName} is typing`
      : `${typingUsers.length} people are typing`;

  return (
    <View
      style={styles.container}
      accessibilityLabel={label}
      accessibilityRole="text"
    >
      <Avatar
        imageUrl={firstUser.userPhotoUrl}
        name={firstUser.userName}
        size={28}
        style={{ marginRight: 8 }}
      />
      <View>
        {isGroupChat && firstUser.userName && (
          <Text style={[styles.senderName, { color: colors.textSecondary }]}>
            {typingUsers.length === 1
              ? firstUser.userName
              : `${firstUser.userName} +${typingUsers.length - 1}`}
          </Text>
        )}
        <View style={[styles.bubble, { backgroundColor: colors.surface }]}>
          <AnimatedDot delay={0} reducedMotion={reducedMotionRef.current} />
          <AnimatedDot delay={200} reducedMotion={reducedMotionRef.current} />
          <AnimatedDot delay={400} reducedMotion={reducedMotionRef.current} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginVertical: 2,
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999',
  },
});
