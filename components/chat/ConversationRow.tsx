import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import Avatar from '../Avatar';
import { Conversation } from '../../types';
import { useAuth } from '../../context/AuthContext';

dayjs.extend(relativeTime);

interface ConversationRowProps {
  conversation: Conversation;
  onPress: () => void;
}

export default function ConversationRow({ conversation, onPress }: ConversationRowProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user } = useAuth();

  // For DMs, show the other user's info
  const otherMember = conversation.type === 'dm'
    ? conversation.members.find(m => m.userId !== user?.id)
    : null;

  const isPendingRequest = conversation.type === 'dm'
    && conversation.members.some(m => m.userId === user?.id && m.status === 'pending');

  const displayName = conversation.type === 'dm'
    ? otherMember?.userName || 'Unknown'
    : conversation.name || 'Group Chat';

  const avatarUrl = conversation.type === 'dm'
    ? otherMember?.userPhotoUrl
    : undefined;

  const timeDisplay = conversation.lastMessageAt
    ? dayjs(conversation.lastMessageAt).fromNow(true)
    : '';

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${displayName} conversation${conversation.unreadCount > 0 ? `, ${conversation.unreadCount} unread` : ''}`}
    >
      <Avatar
        imageUrl={avatarUrl}
        name={displayName}
        size={48}
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.name,
              { color: colors.text },
              conversation.unreadCount > 0 && styles.nameBold,
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {timeDisplay ? (
            <Text style={[styles.time, { color: colors.textTertiary }]}>
              {timeDisplay}
            </Text>
          ) : null}
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.preview,
              { color: colors.textSecondary },
              conversation.unreadCount > 0 && { color: colors.text },
              isPendingRequest && { color: colors.primary, fontStyle: 'italic' },
            ]}
            numberOfLines={1}
          >
            {isPendingRequest ? 'Message request' : conversation.lastMessagePreview || 'No messages yet'}
          </Text>
          {conversation.unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  nameBold: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
