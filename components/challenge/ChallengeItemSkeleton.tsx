import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import Skeleton from '../ui/Skeleton';

export default function ChallengeItemSkeleton() {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.info}>
        <Skeleton width={160} height={18} style={{ marginBottom: 8 }} />
        <Skeleton width={120} height={14} />
      </View>
      <Skeleton width={20} height={20} borderRadius={4} />
    </View>
  );
}

export function ChallengeListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <ChallengeItemSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  info: {
    flex: 1,
  },
});
