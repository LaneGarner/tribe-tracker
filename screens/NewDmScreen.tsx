import React, { useContext, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { RootState, AppDispatch } from '../redux/store';
import { addConversation, selectDmConversations } from '../redux/slices/chatSlice';
import { API_URL, isBackendConfigured } from '../config/api';
import { RootStackParamList } from '../types';
import Avatar from '../components/Avatar';

type NewDmNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NewDm'>;

interface UniqueUser {
  userId: string;
  userName: string;
  userPhotoUrl?: string;
}

export default function NewDmScreen() {
  const navigation = useNavigation<NewDmNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user: authUser, session } = useAuth();

  const [search, setSearch] = useState('');
  const [creatingDmFor, setCreatingDmFor] = useState<string | null>(null);

  const participants = useSelector((state: RootState) => state.participants.data);
  const blockedUsers = useSelector((state: RootState) => state.chat.blockedUsers);
  const existingDmConversations = useSelector(selectDmConversations);

  // Build unique user list from participants, excluding self and blocked users
  const users = useMemo(() => {
    const currentUserId = session?.user?.id;
    const blockedIds = new Set(blockedUsers.map(b => b.blockedId));
    const seen = new Map<string, UniqueUser>();

    for (const p of participants) {
      if (p.userId === currentUserId || blockedIds.has(p.userId)) continue;
      // Skip anonymous participations - only show users by their real identity
      if (p.isAnonymous) continue;
      if (!seen.has(p.userId)) {
        seen.set(p.userId, {
          userId: p.userId,
          userName: p.userName,
          userPhotoUrl: p.userPhotoUrl,
        });
      }
    }

    return Array.from(seen.values()).sort((a, b) =>
      (a.userName || '').localeCompare(b.userName || '')
    );
  }, [participants, session?.user?.id, blockedUsers]);

  // Filter by search
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u => u.userName?.toLowerCase().includes(q));
  }, [users, search]);

  const handleUserPress = async (user: UniqueUser) => {
    if (!session?.access_token || !isBackendConfigured() || creatingDmFor) return;
    setCreatingDmFor(user.userId);

    // Check if DM already exists
    const existingDm = existingDmConversations.find(c =>
      c.members.some(m => m.userId === user.userId)
    );
    if (existingDm) {
      navigation.navigate('DirectMessage', {
        conversationId: existingDm.id,
        otherUserName: user.userName,
      });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          recipientId: user.userId,
          recipientName: user.userName,
          recipientPhotoUrl: user.userPhotoUrl,
          senderName: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || '',
          senderPhotoUrl: authUser?.user_metadata?.profile_photo_url,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        dispatch(addConversation(data.conversation));
        navigation.navigate('DirectMessage', {
          conversationId: data.conversation.id,
          otherUserName: user.userName,
        });
      } else {
        const errorData = await response.json().catch(() => null);
        Alert.alert(
          'Could not start conversation',
          errorData?.error || 'Something went wrong. Please try again.',
        );
      }
    } catch (err) {
      Alert.alert(
        'Network error',
        'Could not reach the server. Check your connection and try again.',
      );
    } finally {
      setCreatingDmFor(null);
    }
  };

  const renderUser = ({ item }: { item: UniqueUser }) => (
    <TouchableOpacity
      style={[styles.userRow, { backgroundColor: colors.surface }]}
      onPress={() => handleUserPress(item)}
      disabled={creatingDmFor === item.userId}
      accessibilityRole="button"
      accessibilityLabel={`Message ${item.userName}`}
    >
      <Avatar
        imageUrl={item.userPhotoUrl}
        name={item.userName}
        size={44}
      />
      <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
        {item.userName || 'Unknown User'}
      </Text>
      {creatingDmFor === item.userId ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons name="chatbubble-outline" size={20} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search people..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search for a person"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={item => item.userId}
        contentContainerStyle={[
          styles.listContent,
          filteredUsers.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {search ? 'No results' : 'No people yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {search
                ? 'Try a different name'
                : 'Join a challenge to connect with other members'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: 44,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  userName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
