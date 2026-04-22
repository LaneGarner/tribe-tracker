import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext, getColors } from '../../theme/ThemeContext';

interface ReplyingToChipProps {
  mode: 'reply' | 'edit';
  senderName?: string;
  preview?: string;
  onCancel: () => void;
}

export default function ReplyingToChip({ mode, senderName, preview, onCancel }: ReplyingToChipProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const label = mode === 'edit'
    ? 'Editing message'
    : `Replying to ${senderName || 'message'}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Ionicons
            name={mode === 'edit' ? 'create-outline' : 'arrow-undo-outline'}
            size={14}
            color={colors.primary}
          />
          <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
        </View>
        {!!preview && (
          <Text
            style={[styles.preview, { color: colors.textSecondary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {preview}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={onCancel}
        hitSlop={14}
        accessibilityRole="button"
        accessibilityLabel={mode === 'edit' ? 'Cancel edit' : 'Cancel reply'}
        style={styles.closeButton}
      >
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 8,
    borderLeftWidth: 3,
    gap: 8,
  },
  body: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  preview: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
