import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../ui/Skeleton';

const COLUMNS = 3;
const SECTIONS = [
  { rows: 1 },
  { rows: 2 },
];

export default function BadgeGridSkeleton() {
  return (
    <View style={styles.container}>
      {SECTIONS.map((section, sIdx) => (
        <View key={sIdx} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Skeleton width={18} height={18} borderRadius={4} />
            <Skeleton width={100} height={16} borderRadius={4} />
          </View>
          {Array.from({ length: section.rows }).map((_, row) => (
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
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 20,
    paddingHorizontal: 12,
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
