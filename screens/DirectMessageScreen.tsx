import React, { useContext, useMemo, useCallback, useEffect, useLayoutEffect } from 'react';
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
  fetchMessagesFromServer,
  addMessage,
  markConversationRead,
  addBlockedUser,
  updateMemberStatus,
} from '../redux/slices/chatSlice';
import { RootStackParamList, ChatMessage, BlockedUser } from '../types';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';
import EmptyChat from '../components/chat/EmptyChat';
import { isBackendConfigured, API_URL } from '../config/api';

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

  const handleSend = useCallback((text: string) => {
    if (!user?.id) return;
    const clientId = Crypto.randomUUID();
    const message: ChatMessage = {
      id: clientId,
      conversationId,
      senderId: user.id,
      senderName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
      content: text,
      type: 'text',
      clientId,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };
    dispatch(addMessage(message));
  }, [dispatch, user, conversationId]);

  const handleAcceptRequest = async () => {
    if (!session?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/dm-requests`, {
        method: 'POST',
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
      }
    } catch (err) {
      console.error('Accept DM request error:', err);
    }
  };

  const handleRejectRequest = async () => {
    if (!session?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/dm-requests`, {
        method: 'POST',
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
      }
    } catch (err) {
      console.error('Reject DM request error:', err);
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
      showSender={false}
    />
  ), [user?.id]);

  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // DM approval status
  const isOwnPending = ownMember?.status === 'pending';
  const isOtherPending = otherMember?.status === 'pending';
  const isOwnRejected = ownMember?.status === 'rejected';
  const isOtherRejected = otherMember?.status === 'rejected';

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

      <ChatInput
        onSend={handleSend}
        disabled={isOwnPending || isOwnRejected || isOtherRejected}
        placeholder={isOwnPending ? 'Accept request to reply...' : 'Message...'}
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
  emptyMessages: {
    flex: 1,
    transform: [{ scaleY: -1 }],
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
