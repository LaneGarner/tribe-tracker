import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { ReplyPreview } from '../../types';

interface QuotedReplyPreviewProps {
  reply: ReplyPreview;
  isOwn: boolean;
  onJumpToMessage?: (messageId: string) => void;
}

export default function QuotedReplyPreview({ reply, isOwn, onJumpToMessage }: QuotedReplyPreviewProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const accent = isOwn ? '#ffffffaa' : colors.primary;
  const bg = isOwn ? '#ffffff22' : colors.background;
  const nameColor = isOwn ? '#ffffffdd' : colors.textSecondary;
  const bodyColor = isOwn ? '#ffffffcc' : colors.textSecondary;

  const handlePress = () => {
    if (reply.isDeleted) return;
    onJumpToMessage?.(reply.id);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={reply.isDeleted}
      accessibilityRole="button"
      accessibilityLabel={`Replying to ${reply.senderName}: ${reply.contentPreview}`}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor: bg, borderLeftColor: accent }]}
    >
      <Text style={[styles.sender, { color: nameColor }]} numberOfLines={1}>
        {reply.isDeleted ? 'Deleted message' : reply.senderName}
      </Text>
      <Text
        style={[styles.body, { color: bodyColor, fontStyle: reply.isDeleted ? 'italic' : 'normal' }]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {reply.isDeleted ? 'Original message was deleted' : reply.contentPreview}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  sender: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    lineHeight: 17,
  },
});
