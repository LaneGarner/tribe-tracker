import React, { useContext, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { BadgeCategory, BadgeDefinition, UserBadge } from '../../types';
import HexBadge from './HexBadge';

const CATEGORY_META: Record<BadgeCategory, { label: string; icon: string; order: number }> = {
  onboarding: { label: 'Getting Started', icon: 'rocket-outline', order: 0 },
  streak:     { label: 'Streaks',         icon: 'flame-outline',  order: 1 },
  volume:     { label: 'Volume',          icon: 'bar-chart-outline', order: 2 },
  challenge:  { label: 'Challenges',      icon: 'trophy-outline', order: 3 },
  social:     { label: 'Social',          icon: 'people-outline', order: 4 },
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

interface BadgeGridProps {
  definitions: BadgeDefinition[];
  earned: UserBadge[];
  onBadgePress?: (badge: BadgeDefinition, userBadge?: UserBadge) => void;
  showOnlyEarned?: boolean;
  numColumns?: number;
}

interface BadgeItem {
  definition: BadgeDefinition;
  userBadge?: UserBadge;
  isEarned: boolean;
}

export default function BadgeGrid({
  definitions,
  earned,
  onBadgePress,
  showOnlyEarned = false,
  numColumns = 3,
}: BadgeGridProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  // Group badge items by category, sorted by category order
  const groupedCategories = useMemo(() => {
    // Create map of earned badges for quick lookup
    const earnedMap = new Map<string, UserBadge>();
    earned.forEach(ub => {
      earnedMap.set(ub.badgeId, ub);
    });

    const badgeItems: BadgeItem[] = definitions
      .map(definition => {
        const userBadge = earnedMap.get(definition.id);
        return {
          definition,
          userBadge,
          isEarned: !!userBadge,
        };
      })
      .filter(item => !showOnlyEarned || item.isEarned);

    // Group by category
    const grouped = new Map<BadgeCategory, BadgeItem[]>();
    for (const item of badgeItems) {
      const cat = item.definition.category;
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(item);
    }

    // Sort items within each category: earned first, then sortOrder
    for (const items of grouped.values()) {
      items.sort((a, b) => {
        if (a.isEarned !== b.isEarned) return a.isEarned ? -1 : 1;
        return a.definition.sortOrder - b.definition.sortOrder;
      });
    }

    // Return categories sorted by order, skipping empty
    return (Object.keys(CATEGORY_META) as BadgeCategory[])
      .sort((a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order)
      .filter(cat => grouped.has(cat))
      .map(cat => ({ category: cat, items: grouped.get(cat)! }));
  }, [definitions, earned, showOnlyEarned]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {groupedCategories.map(({ category, items }) => {
        const meta = CATEGORY_META[category];
        const rows = chunkArray(items, numColumns);

        return (
          <View key={category} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name={meta.icon as any}
                size={18}
                color={colors.textSecondary}
              />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {meta.label}
              </Text>
            </View>
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map(item => {
                  const earnedDate = item.userBadge
                    ? dayjs(item.userBadge.earnedAt).format('MMM D')
                    : undefined;

                  return (
                    <View key={item.definition.id} style={styles.badgeWrapper}>
                      <HexBadge
                        badge={item.definition}
                        earned={item.isEarned}
                        size="md"
                        earnedDate={earnedDate}
                        onPress={
                          onBadgePress
                            ? () => onBadgePress(item.definition, item.userBadge)
                            : undefined
                        }
                      />
                    </View>
                  );
                })}
                {/* Spacers for incomplete rows */}
                {row.length < numColumns &&
                  Array.from({ length: numColumns - row.length }).map((_, i) => (
                    <View key={`spacer-${i}`} style={styles.badgeWrapper} />
                  ))}
              </View>
            ))}
          </View>
        );
      })}
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
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
});
