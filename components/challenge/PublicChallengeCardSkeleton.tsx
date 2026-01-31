import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import Skeleton from '../ui/Skeleton';

export default function PublicChallengeCardSkeleton() {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Skeleton width="75%" height={20} />
          <Skeleton width="40%" height={14} style={{ marginTop: 6 }} />
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Skeleton width={70} height={16} />
        <Skeleton width={70} height={16} />
        <Skeleton width={50} height={16} />
      </View>

      {/* Status row */}
      <View style={styles.statusRow}>
        <Skeleton width={60} height={24} borderRadius={12} />
        <Skeleton width={80} height={14} />
      </View>

      {/* Progress bar */}
      <Skeleton width="100%" height={4} borderRadius={2} style={{ marginTop: 12 }} />
    </View>
  );
}

export function PublicChallengeListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <PublicChallengeCardSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleSection: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
