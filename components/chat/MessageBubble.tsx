import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import Avatar from '../Avatar';
import { ChatMessage } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showSender?: boolean;
  pendingConversation?: boolean;
  onRetry?: () => void;
}

export default function MessageBubble({ message, isOwn, showSender = false, pendingConversation = false, onRetry }: MessageBubbleProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  // System messages are centered
  if (message.type === 'system') {
    return (
      <View style={styles.systemContainer}>
        <Text style={[styles.systemText, { color: colors.textTertiary }]}>
          {message.content}
        </Text>
      </View>
    );
  }

  const time = dayjs(message.createdAt).format('h:mm A');

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      {!isOwn && showSender && (
        <Avatar
          imageUrl={message.senderPhotoUrl}
          name={message.senderName}
          size={28}
          style={{ marginRight: 8 }}
        />
      )}
      <View style={[styles.bubbleWrapper, isOwn && { alignItems: 'flex-end' }]}>
        {!isOwn && showSender && message.senderName && (
          <Text style={[styles.senderName, { color: colors.textSecondary }]}>
            {message.senderName}
          </Text>
        )}
        <View
          style={[
            styles.bubble,
            isOwn
              ? [styles.ownBubble, { backgroundColor: colors.primary }]
              : [styles.otherBubble, { backgroundColor: colors.surface }],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isOwn ? '#fff' : colors.text },
            ]}
          >
            {message.content}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.time, { color: colors.textTertiary }]}>
            {time}
          </Text>
          {isOwn && (
            <>
              {pendingConversation ? (
                <Ionicons name="time-outline" size={12} color={colors.textTertiary} style={styles.statusIcon} />
              ) : (
                <>
                  {message.status === 'sending' && (
                    <Ionicons name="time-outline" size={12} color={colors.textTertiary} style={styles.statusIcon} />
                  )}
                  {message.status === 'sent' && (
                    <Ionicons name="checkmark" size={12} color={colors.textTertiary} style={styles.statusIcon} />
                  )}
                  {message.status === 'failed' && (
                    <TouchableOpacity
                      onPress={onRetry}
                      hitSlop={14}
                      accessibilityRole="button"
                      accessibilityLabel="Retry sending message"
                    >
                      <Ionicons name="alert-circle" size={14} color={colors.error} style={styles.statusIcon} />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 12,
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  bubbleWrapper: {
    maxWidth: '75%',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginLeft: 4,
  },
  time: {
    fontSize: 11,
  },
  statusIcon: {
    marginLeft: 4,
  },
  systemContainer: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  systemText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
