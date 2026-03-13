import React, { useContext, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
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
import MessageBubble from '../components/chat/MessageBubble';
import DateSeparator from '../components/chat/DateSeparator';
import ChatInput from '../components/chat/ChatInput';
import TypingIndicator from '../components/chat/TypingIndicator';
import EmptyChat from '../components/chat/EmptyChat';
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

  useConversationRealtime(conversationId);
  const { typingUsers, sendTypingEvent } = useTypingIndicator(conversationId);

  // Set header title
  useLayoutEffect(() => {
    navigation.setOptions({ title: groupName });
  }, [navigation, groupName]);

  // Memoized selector
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

  // Fetch messages on mount
  useEffect(() => {
    if (session?.access_token && isBackendConfigured()) {
      dispatch(fetchMessagesFromServer({
        token: session.access_token,
        conversationId,
      }));
    }
  }, [dispatch, session?.access_token, conversationId]);

  // Mark as read on focus
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

  const handleSend = useCallback((text: string) => {
    if (!user?.id) return;
    const clientId = Crypto.randomUUID();
    const message: ChatMessage = {
      id: clientId, // temporary, replaced by server
      conversationId,
      senderId: user.id,
      senderName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
      senderPhotoUrl: user.user_metadata?.profile_photo_url,
      content: text,
      type: 'text',
      clientId,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };
    dispatch(addMessage(message));
  }, [dispatch, user, conversationId]);

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
    const msgReaders = readReceiptMap.get(msg.id);
    // Exclude the message sender from readBy
    const readBy = msgReaders?.filter(r => r.userId !== msg.senderId);
    return (
      <MessageBubble
        message={msg}
        isOwn={msg.senderId === user?.id}
        showSender={true}
        showTimestamp={msg.showTimestamp}
        readBy={readBy}
      />
    );
  }, [user?.id, readReceiptMap]);

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
      <ChatInput onSend={handleSend} onTyping={sendTypingEvent} />
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
