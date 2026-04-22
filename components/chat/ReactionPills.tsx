import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { Reaction } from '../../types';

interface ReactionPillsProps {
  reactions: Reaction[];
  isOwn: boolean;
  onToggle: (emoji: string) => void;
}

export default function ReactionPills({ reactions, isOwn, onToggle }: ReactionPillsProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  if (!reactions || reactions.length === 0) return null;

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      {reactions.map(r => (
        <TouchableOpacity
          key={r.emoji}
          onPress={() => onToggle(r.emoji)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${r.count} ${r.emoji} reaction${r.count === 1 ? '' : 's'}${r.selfReacted ? ', you reacted' : ''}`}
          style={[
            styles.pill,
            {
              backgroundColor: r.selfReacted ? colors.primary + '26' : colors.surface,
              borderColor: r.selfReacted ? colors.primary : colors.border,
            },
          ]}
        >
          <Text style={styles.emoji}>{r.emoji}</Text>
          <Text style={[styles.count, { color: r.selfReacted ? colors.primary : colors.textSecondary }]}>
            {r.count}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    marginBottom: 2,
  },
  rowOwn: {
    justifyContent: 'flex-end',
    marginRight: 4,
  },
  rowOther: {
    justifyContent: 'flex-start',
    marginLeft: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
  },
  emoji: {
    fontSize: 13,
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
  },
});
