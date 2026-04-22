import React, { useContext, useMemo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
} from '../redux/slices/chatSlice';
import { RootStackParamList, ChatMessage } from '../types';
import { useConversationRealtime } from '../hooks/useConversationRealtime';
import { useTypingIndicator } from '../hooks/useTypingIndicator';
import { useChatActions } from '../hooks/useChatActions';
import MessageBubble from '../components/chat/MessageBubble';
import DateSeparator from '../components/chat/DateSeparator';
import ChatInput from '../components/chat/ChatInput';
import TypingIndicator from '../components/chat/TypingIndicator';
import EmptyChat from '../components/chat/EmptyChat';
import MessageActionsOverlay from '../components/chat/MessageActionsOverlay';
import { isBackendConfigured } from '../config/api';
import { buildChatDisplayItems, ChatDisplayItem, DateSeparatorItem, DisplayMessage, computeReadReceipts, ReaderInfo } from '../utils/chatUtils';

type GroupChatRouteProp = RouteProp<RootStackParamList, 'GroupChat'>;
type GroupChatNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GroupChat'>;

export default function GroupChatScreen() {
  const navigation = useNavigation<GroupChatNavigationProp>();
  const route = useRoute<GroupChatRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user, session } = useAuth();

  const { conversationId, groupName } = route.params;
  const flatListRef = useRef<FlatList<ChatDisplayItem> | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useConversationRealtime(conversationId);
  const { typingUsers, sendTypingEvent } = useTypingIndicator(conversationId);

  useLayoutEffect(() => {
    navigation.setOptions({ title: groupName });
  }, [navigation, groupName]);

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
    if (session?.access_token && isBackendConfigured()) {
      dispatch(fetchMessagesFromServer({
        token: session.access_token,
        conversationId,
      }));
    }
  }, [dispatch, session?.access_token, conversationId]);

  useEffect(() => {
    dispatch(markConversationRead(conversationId));
  }, [dispatch, conversationId]);

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

  const selectReadReceipts = useMemo(makeSelectReadReceiptsByConversationId, []);
  const readReceipts = useSelector((state: RootState) =>
    selectReadReceipts(state, conversationId)
  );

  const readReceiptMap = useMemo(() => {
    if (!user?.id) return new Map<string, ReaderInfo[]>();
    return computeReadReceipts(messages, readReceipts, user.id);
  }, [messages, readReceipts, user?.id]);

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

  const handleLoadMore = useCallback(() => {
    if (!hasMore || !session?.access_token) return;
    dispatch(fetchMessagesFromServer({
      token: session.access_token,
      conversationId,
      cursor: cursor || undefined,
    }));
  }, [dispatch, session?.access_token, conversationId, hasMore, cursor]);

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

  const renderItem = useCallback(({ item }: { item: ChatDisplayItem }) => {
    if (item.type === 'date-separator') {
      return <DateSeparator date={(item as DateSeparatorItem).date} />;
    }
    const msg = item as DisplayMessage;
    const msgReaders = readReceiptMap.get(msg.id);
    const readBy = msgReaders?.filter(r => r.userId !== msg.senderId);
    return (
      <MessageBubble
        message={msg}
        isOwn={msg.senderId === user?.id}
        showSender={true}
        showTimestamp={msg.showTimestamp}
        readBy={readBy}
        onLongPress={chatActions.handleLongPress}
        onSwipeReply={chatActions.beginReply}
        onJumpToMessage={jumpToMessage}
        onToggleReaction={chatActions.handleToggleReaction}
        highlight={highlightedId === msg.id}
      />
    );
  }, [user?.id, readReceiptMap, chatActions.handleLongPress, chatActions.beginReply, chatActions.handleToggleReaction, jumpToMessage, highlightedId]);

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
          typingUsers.length > 0 ? <TypingIndicator typingUsers={typingUsers} isGroupChat /> : null
        }
      />
      <ChatInput
        onSend={handleSend}
        onEdit={chatActions.handleEditSubmit}
        onTyping={sendTypingEvent}
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
  messageList: {
    paddingVertical: 8,
  },
});
