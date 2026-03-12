import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { RootState, AppDispatch } from '../redux/store';
import { updateMemberStatus, fetchConversationsFromServer, addBlockedUser } from '../redux/slices/chatSlice';
import { isBackendConfigured, API_URL } from '../config/api';
import { DmRequest, BlockedUser } from '../types';
import DmRequestRow from '../components/chat/DmRequestRow';
import EmptyChat from '../components/chat/EmptyChat';
import * as Crypto from 'expo-crypto';

export default function DmRequestsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user, session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const conversations = useSelector((state: RootState) => state.chat.conversations);

  // Build DM requests from conversations where user is pending
  const requests: DmRequest[] = conversations
    .filter(c => c.type === 'dm')
    .filter(c => c.members.some(m => m.userId === user?.id && m.status === 'pending'))
    .map(c => {
      const sender = c.members.find(m => m.userId !== user?.id);
      return {
        conversationId: c.id,
        fromUserId: sender?.userId || '',
        fromUserName: sender?.userName || 'Unknown',
        fromUserPhotoUrl: sender?.userPhotoUrl,
        createdAt: c.updatedAt || '',
      };
    });

  const onRefresh = async () => {
    setRefreshing(true);
    if (session?.access_token && isBackendConfigured()) {
      await dispatch(fetchConversationsFromServer(session.access_token));
    }
    setRefreshing(false);
  };

  const handleAction = async (conversationId: string, action: 'accept' | 'reject') => {
    if (!session?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/dm-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ conversationId, action }),
      });
      if (response.ok) {
        dispatch(updateMemberStatus({
          conversationId,
          userId: user?.id || '',
          status: action === 'accept' ? 'active' : 'rejected',
        }));
        // Auto-block sender on reject
        if (action === 'reject') {
          const conv = conversations.find(c => c.id === conversationId);
          const sender = conv?.members.find(m => m.userId !== user?.id);
          if (sender) {
            const blocked: BlockedUser = {
              id: Crypto.randomUUID(),
              blockedId: sender.userId,
              blockedName: sender.userName,
              blockedPhotoUrl: sender.userPhotoUrl,
              createdAt: new Date().toISOString(),
            };
            dispatch(addBlockedUser(blocked));
          }
        }
      }
    } catch (err) {
      console.error(`DM request ${action} error:`, err);
    }
  };

  const renderRequest = ({ item }: { item: DmRequest }) => (
    <DmRequestRow
      request={item}
      onAccept={() => handleAction(item.conversationId, 'accept')}
      onReject={() => handleAction(item.conversationId, 'reject')}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={item => item.conversationId}
        contentContainerStyle={[
          styles.listContent,
          requests.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={<EmptyChat type="requests" />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  emptyList: {
    flex: 1,
  },
});
