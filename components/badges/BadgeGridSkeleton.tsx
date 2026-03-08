import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../ui/Skeleton';

const COLUMNS = 3;
const ROWS = 3;

export default function BadgeGridSkeleton() {
  return (
    <View style={styles.container}>
      {Array.from({ length: ROWS }).map((_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: COLUMNS }).map((_, col) => (
            <View key={col} style={styles.badgeWrapper}>
              <Skeleton width={80} height={80} borderRadius={40} />
              <Skeleton
                width={60}
                height={12}
                borderRadius={6}
                style={styles.nameBar}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  badgeWrapper: {
    flex: 1,
    maxWidth: '33%',
    alignItems: 'center',
  },
  nameBar: {
    marginTop: 8,
  },
});
