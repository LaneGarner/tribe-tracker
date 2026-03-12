import React, { useContext, useMemo, useCallback, useEffect, useLayoutEffect } from 'react';
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
  fetchMessagesFromServer,
  addMessage,
  markConversationRead,
} from '../redux/slices/chatSlice';
import { RootStackParamList, ChatMessage } from '../types';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';
import EmptyChat from '../components/chat/EmptyChat';
import { isBackendConfigured } from '../config/api';

type GroupChatRouteProp = RouteProp<RootStackParamList, 'GroupChat'>;
type GroupChatNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GroupChat'>;

export default function GroupChatScreen() {
  const navigation = useNavigation<GroupChatNavigationProp>();
  const route = useRoute<GroupChatRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user, session } = useAuth();

  const { conversationId, challengeName } = route.params;

  // Set header title
  useLayoutEffect(() => {
    navigation.setOptions({ title: challengeName });
  }, [navigation, challengeName]);

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

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <MessageBubble
      message={item}
      isOwn={item.senderId === user?.id}
      showSender={true}
    />
  ), [user?.id]);

  // Invert the list to show newest at bottom
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={reversedMessages}
        renderItem={renderMessage}
        keyExtractor={item => item.clientId || item.id}
        inverted
        contentContainerStyle={[
          styles.messageList,
          reversedMessages.length === 0 && styles.emptyMessages,
        ]}
        ListEmptyComponent={<EmptyChat type="messages" inverted />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
      />
      <ChatInput onSend={handleSend} />
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
  emptyMessages: {
    flex: 1,
    transform: [{ scaleY: -1 }],
  },
});
