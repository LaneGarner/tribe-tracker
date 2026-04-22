import React, { useContext, useMemo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import * as Crypto from 'expo-crypto';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { RootState, AppDispatch } from '../redux/store';
import {
  makeSelectMessagesByConversationId,
  makeSelectReadReceiptsByConversationId,
  fetchMessagesFromServer,
  addMessage,
  markConversationRead,
  markConversationAsRead,
  addBlockedUser,
  updateMemberStatus,
} from '../redux/slices/chatSlice';
import { RootStackParamList, ChatMessage, BlockedUser } from '../types';
import { useConversationRealtime } from '../hooks/useConversationRealtime';
import { useTypingIndicator } from '../hooks/useTypingIndicator';
import MessageBubble from '../components/chat/MessageBubble';
import DateSeparator from '../components/chat/DateSeparator';
import ChatInput from '../components/chat/ChatInput';
import TypingIndicator from '../components/chat/TypingIndicator';
import EmptyChat from '../components/chat/EmptyChat';
import MessageActionsOverlay from '../components/chat/MessageActionsOverlay';
import { useChatActions } from '../hooks/useChatActions';
import { isBackendConfigured, API_URL } from '../config/api';
import { buildChatDisplayItems, ChatDisplayItem, DateSeparatorItem, DisplayMessage, computeReadReceipts, ReaderInfo } from '../utils/chatUtils';

type DirectMessageRouteProp = RouteProp<RootStackParamList, 'DirectMessage'>;
type DirectMessageNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DirectMessage'>;

export default function DirectMessageScreen() {
  const navigation = useNavigation<DirectMessageNavigationProp>();
  const route = useRoute<DirectMessageRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user, session } = useAuth();

  const { conversationId, otherUserName } = route.params;
  const flatListRef = useRef<FlatList<ChatDisplayItem> | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useConversationRealtime(conversationId);
  const { typingUsers, sendTypingEvent } = useTypingIndicator(conversationId);

  const conversation = useSelector((state: RootState) =>
    state.chat.conversations.find(c => c.id === conversationId)
  );

  const otherMember = conversation?.members.find(m => m.userId !== user?.id);
  const ownMember = conversation?.members.find(m => m.userId === user?.id);
  const displayName = otherUserName || otherMember?.userName || 'Message';

  // Set header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: displayName,
      headerRight: () => (
        <TouchableOpacity
          onPress={handleOptionsMenu}
          hitSlop={14}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Chat options"
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, displayName, colors.text]);

  const selectMessages = useMemo(makeSelectMessagesByConversationId, []);
  const messages = useSelector((state: RootState) =>
    selectMessages(state, conversationId)
  );
  const hasMore = useSelector((state: RootState) =>
    state.chat.hasMoreMessages[conversationId] ?? true
  );
  const cursor = useSelector((state: RootState) =>
    state.chat.messageCursors[conversationId]
  );

  useEffect(() => {
    if (session?.access_token && isBackendConfigured() && ownMember?.status === 'active') {
      dispatch(fetchMessagesFromServer({
        token: session.access_token,
        conversationId,
      }));
    }
  }, [dispatch, session?.access_token, conversationId, ownMember?.status]);

  useEffect(() => {
    dispatch(markConversationRead(conversationId));
  }, [dispatch, conversationId]);

  // Mark conversation as read (debounced) on mount and when new messages arrive
  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!session?.access_token || !user?.id || !isBackendConfigured()) return;
    if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    markReadTimerRef.current = setTimeout(() => {
      dispatch(markConversationAsRead({
        token: session.access_token!,
        conversationId,
        userId: user.id,
      }));
    }, 300);
    return () => {
      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    };
  }, [dispatch, session?.access_token, user?.id, conversationId, messages.length]);

  // Read receipts
  const selectReadReceipts = useMemo(makeSelectReadReceiptsByConversationId, []);
  const readReceipts = useSelector((state: RootState) =>
    selectReadReceipts(state, conversationId)
  );

  const readReceiptMap = useMemo(() => {
    if (!user?.id) return new Map<string, ReaderInfo[]>();
    return computeReadReceipts(messages, readReceipts, user.id);
  }, [messages, readReceipts, user?.id]);

  // For DMs, find the single message the other person has read up to
  const otherReadMessageId = useMemo(() => {
    for (const [msgId, readers] of readReceiptMap.entries()) {
      if (readers.length > 0) return msgId;
    }
    return null;
  }, [readReceiptMap]);

  const flashMessage = useCallback((messageId: string) => {
    setHighlightedId(messageId);
    setTimeout(() => setHighlightedId(prev => (prev === messageId ? null : prev)), 1200);
  }, []);

  const chatActions = useChatActions({
    conversationId,
    currentUserId: user?.id,
    flashMessage,
  });

  const handleSend = useCallback((text: string, replyToMessageId?: string) => {
    if (!user?.id) return;
    const clientId = Crypto.randomUUID();
    const parentMsg = replyToMessageId
      ? messages.find(m => m.id === replyToMessageId)
      : undefined;
    const message: ChatMessage = {
      id: clientId,
      conversationId,
      senderId: user.id,
      senderName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
      senderPhotoUrl: user.user_metadata?.profile_photo_url,
      content: text,
      type: 'text',
      clientId,
      status: 'sending',
      createdAt: new Date().toISOString(),
      replyTo: parentMsg
        ? {
            id: parentMsg.id,
            senderId: parentMsg.senderId,
            senderName: parentMsg.senderName || '',
            contentPreview: (parentMsg.content || '').substring(0, 140),
            isDeleted: !!parentMsg.deletedAt,
          }
        : undefined,
    };
    dispatch(addMessage(message));
  }, [dispatch, user, conversationId, messages]);

  const jumpToMessage = useCallback((messageId: string) => {
    const reversed = [...messages].reverse();
    const items = buildChatDisplayItems(reversed);
    const index = items.findIndex(item => item.type !== 'date-separator' && (item as DisplayMessage).id === messageId);
    if (index >= 0) {
      try {
        flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      } catch (err) {
        console.warn('scrollToIndex failed:', err);
      }
      flashMessage(messageId);
    }
  }, [messages, flashMessage]);

  const handleAcceptRequest = async () => {
    if (!session?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/conversations`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ conversationId, action: 'accept' }),
      });
      if (response.ok) {
        dispatch(updateMemberStatus({
          conversationId,
          userId: user?.id || '',
          status: 'active',
        }));
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Accept DM request error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleRejectRequest = async () => {
    if (!session?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/conversations`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ conversationId, action: 'reject' }),
      });
      if (response.ok) {
        dispatch(updateMemberStatus({
          conversationId,
          userId: user?.id || '',
          status: 'rejected',
        }));
        // Auto-block sender on reject
        if (otherMember) {
          const blocked: BlockedUser = {
            id: Crypto.randomUUID(),
            blockedId: otherMember.userId,
            blockedName: otherMember.userName,
            blockedPhotoUrl: otherMember.userPhotoUrl,
            createdAt: new Date().toISOString(),
          };
          dispatch(addBlockedUser(blocked));
        }
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Reject DM request error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleBlockUser = () => {
    if (!otherMember) return;
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${otherMember.userName || 'this user'}? They won't be able to send you messages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            const blocked: BlockedUser = {
              id: Crypto.randomUUID(),
              blockedId: otherMember.userId,
              blockedName: otherMember.userName,
              blockedPhotoUrl: otherMember.userPhotoUrl,
              createdAt: new Date().toISOString(),
            };
            dispatch(addBlockedUser(blocked));
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleOptionsMenu = () => {
    Alert.alert('Chat Options', undefined, [
      {
        text: 'Block User',
        style: 'destructive',
        onPress: handleBlockUser,
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // DM approval status
  const isOwnPending = ownMember?.status === 'pending';
  const isOtherPending = otherMember?.status === 'pending';
  const isOwnRejected = ownMember?.status === 'rejected';
  const isOtherRejected = otherMember?.status === 'rejected';

  const handleLoadMore = useCallback(() => {
    if (!hasMore || !session?.access_token) return;
    dispatch(fetchMessagesFromServer({
      token: session.access_token,
      conversationId,
      cursor: cursor || undefined,
    }));
  }, [dispatch, session?.access_token, conversationId, hasMore, cursor]);

  const renderItem = useCallback(({ item }: { item: ChatDisplayItem }) => {
    if (item.type === 'date-separator') {
      return <DateSeparator date={(item as DateSeparatorItem).date} />;
    }
    const msg = item as DisplayMessage;
    const isOwn = msg.senderId === user?.id;
    return (
      <MessageBubble
        message={msg}
        isOwn={isOwn}
        showAvatar={true}
        avatarUrl={otherMember?.userPhotoUrl}
        pendingConversation={isOtherPending}
        showTimestamp={msg.showTimestamp}
        readByOther={isOwn && msg.id === otherReadMessageId}
        onLongPress={chatActions.handleLongPress}
        onSwipeReply={chatActions.beginReply}
        onJumpToMessage={jumpToMessage}
        onToggleReaction={chatActions.handleToggleReaction}
        highlight={highlightedId === msg.id}
      />
    );
  }, [user?.id, isOtherPending, otherMember?.userPhotoUrl, otherReadMessageId, chatActions.handleLongPress, chatActions.beginReply, chatActions.handleToggleReaction, jumpToMessage, highlightedId]);

  const displayItems = useMemo(() => {
    const reversed = [...messages].reverse();
    return buildChatDisplayItems(reversed);
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Status banners */}
      {isOwnPending && (
        <View style={[styles.banner, { backgroundColor: colors.warning + '20' }]}>
          <Text style={[styles.bannerText, { color: colors.warning }]}>
            Accept this message request?
          </Text>
          <View style={styles.bannerActions}>
            <TouchableOpacity
              style={[styles.bannerButton, { backgroundColor: colors.primary }]}
              onPress={handleAcceptRequest}
              accessibilityRole="button"
              accessibilityLabel="Accept message request"
            >
              <Text style={styles.bannerButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bannerButton, { backgroundColor: colors.error }]}
              onPress={handleRejectRequest}
              accessibilityRole="button"
              accessibilityLabel="Reject message request"
            >
              <Text style={styles.bannerButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isOtherPending && (
        <View style={[styles.banner, { backgroundColor: colors.textTertiary + '20' }]}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
            Waiting for {otherMember?.userName || 'them'} to accept your message request
          </Text>
        </View>
      )}

      {(isOwnRejected || isOtherRejected) && (
        <View style={[styles.banner, { backgroundColor: colors.error + '15' }]}>
          <Text style={[styles.bannerText, { color: colors.error }]}>
            {isOtherRejected ? 'Request declined' : 'You declined this request'}
          </Text>
        </View>
      )}

      {displayItems.length === 0 && (
        <View style={StyleSheet.absoluteFill}>
          <EmptyChat type="messages" />
        </View>
      )}
      <FlatList
        ref={flatListRef}
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={item => item.type === 'date-separator' ? item.id : (item as DisplayMessage).clientId || item.id}
        inverted
        contentContainerStyle={styles.messageList}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          typingUsers.length > 0 ? <TypingIndicator typingUsers={typingUsers} /> : null
        }
      />

      <ChatInput
        onSend={handleSend}
        onEdit={chatActions.handleEditSubmit}
        onTyping={sendTypingEvent}
        disabled={isOwnPending || isOwnRejected || isOtherRejected}
        placeholder={isOwnPending ? 'Accept request to reply...' : 'Message...'}
        replyingTo={chatActions.replyingTo}
        onCancelReply={chatActions.cancelReply}
        editing={chatActions.editing}
        onCancelEdit={chatActions.cancelEdit}
      />
      <MessageActionsOverlay
        target={chatActions.actionsTarget}
        onClose={chatActions.closeActions}
        onReact={chatActions.handleToggleReaction}
        onReply={chatActions.beginReply}
        onCopy={chatActions.handleCopy}
        onEdit={chatActions.beginEdit}
        onDelete={chatActions.handleDelete}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingVertical: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bannerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
