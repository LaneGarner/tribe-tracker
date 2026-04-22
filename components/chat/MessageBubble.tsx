import React, { useContext, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  withSequence,
} from 'react-native-reanimated';
import dayjs from 'dayjs';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import Avatar from '../Avatar';
import { ChatMessage } from '../../types';
import { ReaderInfo } from '../../utils/chatUtils';
import QuotedReplyPreview from './QuotedReplyPreview';
import ReactionPills from './ReactionPills';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showSender?: boolean;
  showAvatar?: boolean;
  avatarUrl?: string;
  pendingConversation?: boolean;
  showTimestamp?: boolean;
  onRetry?: () => void;
  readByOther?: boolean;
  readBy?: ReaderInfo[];
  onLongPress?: (message: ChatMessage, bubbleY: number, bubbleHeight: number, isOwn: boolean) => void;
  onSwipeReply?: (message: ChatMessage) => void;
  onJumpToMessage?: (messageId: string) => void;
  onToggleReaction?: (message: ChatMessage, emoji: string) => void;
  highlight?: boolean;
}

const SWIPE_THRESHOLD = 60;

export default function MessageBubble({
  message,
  isOwn,
  showSender = false,
  showAvatar,
  avatarUrl,
  pendingConversation = false,
  showTimestamp = true,
  onRetry,
  readByOther,
  readBy,
  onLongPress,
  onSwipeReply,
  onJumpToMessage,
  onToggleReaction,
  highlight,
}: MessageBubbleProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const wrapperRef = useRef<View | null>(null);

  // System messages: no gestures, no actions
  if (message.type === 'system') {
    return (
      <View style={styles.systemContainer}>
        <Text style={[styles.systemText, { color: colors.textTertiary }]}>
          {message.content}
        </Text>
      </View>
    );
  }

  const isDeleted = !!message.deletedAt;
  const time = dayjs(message.createdAt).format('h:mm A');

  const translateX = useSharedValue(0);
  const highlightOpacity = useSharedValue(highlight ? 1 : 0);

  React.useEffect(() => {
    if (highlight) {
      highlightOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 900 })
      );
    }
  }, [highlight, highlightOpacity]);

  const triggerLongPress = useCallback(() => {
    if (isDeleted) return;
    if (!wrapperRef.current || !onLongPress) return;
    wrapperRef.current.measureInWindow((x, y, width, height) => {
      onLongPress(message, y, height, isOwn);
    });
  }, [isDeleted, message, isOwn, onLongPress]);

  const triggerSwipeReply = useCallback(() => {
    if (isDeleted) return;
    onSwipeReply?.(message);
  }, [isDeleted, message, onSwipeReply]);

  const longPress = Gesture.LongPress()
    .minDuration(380)
    .enabled(!isDeleted && !!onLongPress)
    .onStart(() => {
      runOnJS(triggerLongPress)();
    });

  const pan = Gesture.Pan()
    .enabled(!isDeleted && !!onSwipeReply)
    .activeOffsetX(10)
    .failOffsetY([-8, 8])
    .onUpdate(e => {
      const x = Math.max(0, Math.min(e.translationX, 90));
      translateX.value = x;
    })
    .onEnd(e => {
      if (e.translationX > SWIPE_THRESHOLD) {
        runOnJS(triggerSwipeReply)();
      }
      translateX.value = withTiming(0, { duration: 160 });
    });

  const composed = Gesture.Exclusive(longPress, pan);

  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: highlightOpacity.value,
  }));

  const handleToggle = (emoji: string) => {
    if (isDeleted) return;
    onToggleReaction?.(message, emoji);
  };

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      {!isOwn && (showAvatar ?? showSender) && (
        <Avatar
          imageUrl={message.senderPhotoUrl || avatarUrl}
          name={message.senderName}
          size={28}
          style={{ marginRight: 8 }}
        />
      )}
      <View ref={wrapperRef} style={[styles.bubbleWrapper, isOwn && { alignItems: 'flex-end' }]}>
        {!isOwn && showSender && message.senderName && (
          <Text style={[styles.senderName, { color: colors.textSecondary }]}>
            {message.senderName}
          </Text>
        )}
        <GestureDetector gesture={composed}>
          <Animated.View style={bubbleAnimatedStyle}>
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                styles.highlight,
                { backgroundColor: colors.primary + '33' },
                highlightStyle,
              ]}
            />
            <View
              style={[
                styles.bubble,
                isOwn
                  ? [styles.ownBubble, { backgroundColor: isDeleted ? colors.surface : colors.primary }]
                  : [styles.otherBubble, { backgroundColor: colors.surface }],
              ]}
            >
              {message.replyTo && !isDeleted && (
                <QuotedReplyPreview reply={message.replyTo} isOwn={isOwn} onJumpToMessage={onJumpToMessage} />
              )}
              {isDeleted ? (
                <Text style={[styles.deletedText, { color: colors.textTertiary }]}>Message deleted</Text>
              ) : (
                <Text
                  style={[
                    styles.messageText,
                    { color: isOwn ? '#fff' : colors.text },
                  ]}
                >
                  {message.content}
                </Text>
              )}
            </View>
          </Animated.View>
        </GestureDetector>
        {!isDeleted && message.reactions && message.reactions.length > 0 && (
          <ReactionPills
            reactions={message.reactions}
            isOwn={isOwn}
            onToggle={handleToggle}
          />
        )}
        {showTimestamp && <View style={styles.metaRow}>
          <Text style={[styles.time, { color: colors.textTertiary }]}>
            {time}
          </Text>
          {message.editedAt && !isDeleted && (
            <Text style={[styles.edited, { color: colors.textTertiary }]}>· edited</Text>
          )}
          {isOwn && !isDeleted && (
            <>
              {pendingConversation ? (
                <Ionicons name="time-outline" size={12} color={colors.textTertiary} style={styles.statusIcon} />
              ) : (
                <>
                  {message.status === 'sending' && (
                    <Ionicons name="time-outline" size={12} color={colors.textTertiary} style={styles.statusIcon} />
                  )}
                  {message.status === 'sent' && readByOther && (
                    <Ionicons
                      name="checkmark-done"
                      size={12}
                      color={colors.primary}
                      style={styles.statusIcon}
                      accessibilityLabel="Read"
                    />
                  )}
                  {message.status === 'sent' && !readByOther && (
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
        </View>}
        {readBy && readBy.length > 0 && (
          <View
            style={[styles.readByRow, isOwn ? styles.readByRowOwn : styles.readByRowOther]}
            accessibilityLabel={`Read by ${readBy.map(r => r.userName).join(', ')}`}
          >
            {readBy.slice(0, 4).map((reader, index) => (
              <Avatar
                key={reader.userId}
                imageUrl={reader.userPhotoUrl}
                name={reader.userName}
                size={16}
                style={index > 0 ? { marginLeft: -4 } : undefined}
              />
            ))}
            {readBy.length > 4 && (
              <Text style={[styles.readByOverflow, { color: colors.textTertiary }]}>
                +{readBy.length - 4}
              </Text>
            )}
          </View>
        )}
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
  deletedText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginLeft: 4,
    gap: 4,
  },
  time: {
    fontSize: 11,
  },
  edited: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  statusIcon: {
    marginLeft: 4,
  },
  readByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  readByRowOwn: {
    justifyContent: 'flex-end',
    marginRight: 4,
  },
  readByRowOther: {
    justifyContent: 'flex-start',
    marginLeft: 4,
  },
  readByOverflow: {
    fontSize: 10,
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
  highlight: {
    borderRadius: 18,
  },
});
