import React, { useContext, useCallback } from 'react';
import { View, FlatList, StyleSheet, ListRenderItem } from 'react-native';
import dayjs from 'dayjs';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { BadgeDefinition, UserBadge } from '../../types';
import HexBadge from './HexBadge';

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

  // Create map of earned badges for quick lookup
  const earnedMap = new Map<string, UserBadge>();
  earned.forEach(ub => {
    // For badges that can be earned multiple times per challenge, use badgeId only
    // This marks the badge as earned if ANY instance exists
    earnedMap.set(ub.badgeId, ub);
  });

  // Prepare badge items
  const badgeItems: BadgeItem[] = definitions
    .map(definition => {
      const userBadge = earnedMap.get(definition.id);
      return {
        definition,
        userBadge,
        isEarned: !!userBadge,
      };
    })
    .filter(item => !showOnlyEarned || item.isEarned)
    .sort((a, b) => {
      // Sort earned first, then by sort order
      if (a.isEarned !== b.isEarned) {
        return a.isEarned ? -1 : 1;
      }
      return a.definition.sortOrder - b.definition.sortOrder;
    });

  const renderItem: ListRenderItem<BadgeItem> = useCallback(
    ({ item }) => {
      const earnedDate = item.userBadge
        ? dayjs(item.userBadge.earnedAt).format('MMM D')
        : undefined;

      return (
        <View style={styles.badgeWrapper}>
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
    },
    [onBadgePress]
  );

  const keyExtractor = useCallback(
    (item: BadgeItem) => item.definition.id,
    []
  );

  return (
    <FlatList
      data={badgeItems}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
      columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  row: {
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
