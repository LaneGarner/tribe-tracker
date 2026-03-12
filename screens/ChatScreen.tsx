import React, { useContext, useState, useCallback, useEffect } from 'react';
import {
  View,
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
  selectAllConversationsSorted,
} from '../redux/slices/chatSlice';
import { useChatRealtime } from '../hooks/useChatRealtime';
import { isBackendConfigured } from '../config/api';
import { RootStackParamList, Conversation } from '../types';
import ConversationRow from '../components/chat/ConversationRow';
import EmptyChat from '../components/chat/EmptyChat';
import Skeleton from '../components/ui/Skeleton';

type ChatNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

export default function ChatScreen() {
  const navigation = useNavigation<ChatNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { session } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const loading = useSelector((state: RootState) => state.chat.loading);
  const conversations = useSelector(selectAllConversationsSorted);

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

  const renderConversation = ({ item }: { item: Conversation }) => (
    <ConversationRow
      conversation={item}
      onPress={() => handleConversationPress(item)}
    />
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          conversations.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={<EmptyChat type="chat" />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('NewDm')}
        accessibilityRole="button"
        accessibilityLabel="New direct message"
      >
        <Ionicons name="create-outline" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingTop: 8,
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
