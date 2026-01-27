import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton from '../ui/Skeleton';

export default function ChallengeCardSkeleton() {
  return (
    <LinearGradient
      colors={['#4DC9E6', '#1E90B0']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Header with title and streak badge */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Skeleton width={180} height={24} style={styles.whiteSkeleton} />
          <Skeleton width={120} height={16} style={[styles.whiteSkeleton, { marginTop: 8 }]} />
        </View>
        <Skeleton width={70} height={50} borderRadius={12} style={styles.whiteSkeleton} />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Skeleton width={60} height={12} style={styles.whiteSkeleton} />
          <Skeleton width={50} height={32} style={[styles.whiteSkeleton, { marginTop: 4 }]} />
        </View>
        <View style={styles.statItem}>
          <Skeleton width={60} height={12} style={styles.whiteSkeleton} />
          <Skeleton width={40} height={32} style={[styles.whiteSkeleton, { marginTop: 4 }]} />
        </View>
        <View style={styles.statItem}>
          <Skeleton width={70} height={12} style={styles.whiteSkeleton} />
          <Skeleton width={40} height={32} style={[styles.whiteSkeleton, { marginTop: 4 }]} />
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Skeleton width={60} height={14} style={styles.whiteSkeleton} />
          <Skeleton width={40} height={14} style={styles.whiteSkeleton} />
        </View>
        <Skeleton width="100%" height={8} borderRadius={4} style={styles.whiteSkeleton} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressSection: {
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  whiteSkeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
