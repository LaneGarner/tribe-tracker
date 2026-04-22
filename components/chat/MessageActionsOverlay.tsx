import React, { useContext, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  Keyboard,
  Vibration,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { ChatMessage } from '../../types';

export const PRESET_REACTIONS = ['👍', '👎', '❤️', '🎉', '🔥', '💪', '😂'];

export interface ActionsTarget {
  message: ChatMessage;
  bubbleY: number;
  bubbleHeight: number;
  isOwn: boolean;
}

interface MessageActionsOverlayProps {
  target: ActionsTarget | null;
  onClose: () => void;
  onReact: (message: ChatMessage, emoji: string) => void;
  onReply: (message: ChatMessage) => void;
  onCopy: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
}

const SCREEN = Dimensions.get('window');

export default function MessageActionsOverlay({
  target,
  onClose,
  onReact,
  onReply,
  onCopy,
  onEdit,
  onDelete,
}: MessageActionsOverlayProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const backdrop = useSharedValue(0);
  const sheetScale = useSharedValue(0.9);

  useEffect(() => {
    if (target) {
      Keyboard.dismiss();
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        Vibration.vibrate(10);
      }
      backdrop.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
      sheetScale.value = withSpring(1, { damping: 18, stiffness: 240 });
    } else {
      backdrop.value = withTiming(0, { duration: 140 });
      sheetScale.value = 0.9;
    }
  }, [target, backdrop, sheetScale]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
    transform: [{ scale: sheetScale.value }],
  }));

  if (!target) {
    return null;
  }

  const { message, bubbleY, bubbleHeight, isOwn } = target;
  const canModify = isOwn && !message.deletedAt;
  const canCopy = !message.deletedAt && message.type !== 'system';

  // Position emoji row above the bubble if there's room, otherwise below.
  const emojiRowHeight = 52;
  const actionListHeight = 48 * (2 + (canModify ? 2 : 0));
  const gap = 10;
  const totalHeight = emojiRowHeight + gap + actionListHeight;
  const availableBelow = SCREEN.height - (bubbleY + bubbleHeight);
  const availableAbove = bubbleY;
  const anchorTop = availableBelow > totalHeight + 40
    ? bubbleY + bubbleHeight + gap
    : Math.max(40, bubbleY - totalHeight - gap);

  return (
    <Modal transparent visible={!!target} onRequestClose={onClose} animationType="none">
      <Pressable style={styles.root} onPress={onClose} accessibilityLabel="Dismiss">
        <Animated.View style={[StyleSheet.absoluteFill, styles.dim, backdropStyle]} />
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.sheetWrap,
            sheetStyle,
            { top: anchorTop, alignItems: isOwn ? 'flex-end' : 'flex-start' },
          ]}
        >
          <View style={[styles.emojiRow, { backgroundColor: colors.surface }]}>
            {PRESET_REACTIONS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                onPress={() => {
                  onReact(message, emoji);
                  onClose();
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`React with ${emoji}`}
                style={styles.emojiButton}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.actionList, { backgroundColor: colors.surface }]}>
            <ActionRow
              icon="arrow-undo-outline"
              label="Reply"
              color={colors.text}
              onPress={() => {
                onReply(message);
                onClose();
              }}
            />
            {canCopy && (
              <ActionRow
                icon="copy-outline"
                label="Copy"
                color={colors.text}
                divider
                onPress={() => {
                  onCopy(message);
                  onClose();
                }}
              />
            )}
            {canModify && (
              <ActionRow
                icon="create-outline"
                label="Edit"
                color={colors.text}
                divider
                onPress={() => {
                  onEdit(message);
                  onClose();
                }}
              />
            )}
            {canModify && (
              <ActionRow
                icon="trash-outline"
                label="Delete"
                color={colors.error}
                divider
                onPress={() => {
                  onDelete(message);
                  onClose();
                }}
              />
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function ActionRow({
  icon,
  label,
  color,
  divider,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  divider?: boolean;
  onPress: () => void;
}) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.actionRow,
        divider && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
      <Ionicons name={icon} size={18} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dim: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  emojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 26,
    marginBottom: 10,
    gap: 2,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  emoji: {
    fontSize: 24,
  },
  actionList: {
    borderRadius: 14,
    overflow: 'hidden',
    minWidth: 220,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
});
