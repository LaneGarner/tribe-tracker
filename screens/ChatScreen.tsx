import React, { useContext, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { RootState, AppDispatch } from '../redux/store';
import {
  fetchConversationsFromServer,
  loadChatFromStorage,
  selectGroupConversations,
  selectDmConversations,
  selectPendingDmRequests,
} from '../redux/slices/chatSlice';
import { useChatRealtime } from '../hooks/useChatRealtime';
import { isBackendConfigured } from '../config/api';
import { RootStackParamList, Conversation } from '../types';
import ConversationRow from '../components/chat/ConversationRow';
import EmptyChat from '../components/chat/EmptyChat';
import SegmentedControl from '../components/SegmentedControl';
import Skeleton from '../components/ui/Skeleton';

type ChatNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

type Tab = 'groups' | 'direct';

export default function ChatScreen() {
  const navigation = useNavigation<ChatNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { session } = useAuth();

  const [tab, setTab] = useState<Tab>('groups');
  const [refreshing, setRefreshing] = useState(false);
  const loading = useSelector((state: RootState) => state.chat.loading);

  const groupConversations = useSelector(selectGroupConversations);
  const dmConversations = useSelector(selectDmConversations);
  const pendingRequests = useSelector(selectPendingDmRequests);

  // Set up realtime subscriptions
  useChatRealtime();

  // Load from storage on mount
  useEffect(() => {
    dispatch(loadChatFromStorage());
  }, [dispatch]);

  // Fetch from server on focus
  useFocusEffect(
    useCallback(() => {
      if (session?.access_token && isBackendConfigured()) {
        dispatch(fetchConversationsFromServer(session.access_token));
      }
    }, [dispatch, session?.access_token])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (session?.access_token && isBackendConfigured()) {
      await dispatch(fetchConversationsFromServer(session.access_token));
    }
    setRefreshing(false);
  };

  const handleConversationPress = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      navigation.navigate('GroupChat', {
        conversationId: conversation.id,
        challengeName: conversation.name || 'Group Chat',
      });
    } else {
      const otherMember = conversation.members.find(m => m.userId !== session?.user?.id);
      navigation.navigate('DirectMessage', {
        conversationId: conversation.id,
        otherUserName: otherMember?.userName,
      });
    }
  };

  const conversations = tab === 'groups' ? groupConversations : dmConversations;

  const tabOptions: { value: Tab; label: string }[] = [
    { value: 'groups', label: 'Groups' },
    { value: 'direct', label: 'Direct' },
  ];

  const renderConversation = ({ item }: { item: Conversation }) => (
    <ConversationRow
      conversation={item}
      onPress={() => handleConversationPress(item)}
    />
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <SegmentedControl options={tabOptions} value={tab} onValueChange={setTab} accessibilityLabel="Chat tabs" />
        </View>
        <View style={styles.skeletonList}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.skeletonRow, { backgroundColor: colors.surface }]}>
              <Skeleton width={48} height={48} borderRadius={24} />
              <View style={styles.skeletonContent}>
                <Skeleton width="60%" height={16} />
                <Skeleton width="80%" height={14} style={{ marginTop: 6 }} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <SegmentedControl options={tabOptions} value={tab} onValueChange={setTab} accessibilityLabel="Chat tabs" />
      </View>

      {/* Pending DM requests banner */}
      {tab === 'direct' && pendingRequests.length > 0 && (
        <TouchableOpacity
          style={[styles.requestsBanner, { backgroundColor: colors.primary + '15' }]}
          onPress={() => navigation.navigate('DmRequests')}
          accessibilityRole="button"
          accessibilityLabel={`${pendingRequests.length} pending message request${pendingRequests.length !== 1 ? 's' : ''}`}
        >
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
          <Text style={[styles.requestsText, { color: colors.primary }]}>
            {pendingRequests.length} message request{pendingRequests.length !== 1 ? 's' : ''}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      )}

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          conversations.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={<EmptyChat type={tab} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* New DM FAB on Direct tab */}
      {tab === 'direct' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => {
            // TODO: Navigate to user search/selection for new DM
          }}
          accessibilityRole="button"
          accessibilityLabel="New direct message"
        >
          <Ionicons name="create-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  requestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 8,
  },
  requestsText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
  },
  skeletonList: {
    paddingHorizontal: 20,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  skeletonContent: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
