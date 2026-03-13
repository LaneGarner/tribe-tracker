import React, { useContext, useState, useMemo, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { RootState, AppDispatch } from '../redux/store';
import { addConversation } from '../redux/slices/chatSlice';
import { API_URL, isBackendConfigured } from '../config/api';
import { RootStackParamList } from '../types';
import Avatar from '../components/Avatar';

type NewGroupChatNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NewGroupChat'>;

interface UniqueUser {
  userId: string;
  userName: string;
  userPhotoUrl?: string;
}

export default function NewGroupChatScreen() {
  const navigation = useNavigation<NewGroupChatNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { session } = useAuth();

  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UniqueUser[]>([]);
  const [creating, setCreating] = useState(false);

  const participants = useSelector((state: RootState) => state.participants.data);
  const blockedUsers = useSelector((state: RootState) => state.chat.blockedUsers);

  const canCreate = groupName.trim().length > 0 && selectedUsers.length >= 2;

  const handleCreate = useCallback(async () => {
    if (!canCreate || !session?.access_token || !isBackendConfigured() || creating) return;
    setCreating(true);

    try {
      const response = await fetch(`${API_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'group',
          name: groupName.trim(),
          memberIds: selectedUsers.map(u => u.userId),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        dispatch(addConversation(data.conversation));
        navigation.replace('GroupChat', {
          conversationId: data.conversation.id,
          groupName: data.conversation.name || groupName.trim(),
        });
      } else {
        const errorData = await response.json().catch(() => null);
        Alert.alert(
          'Could not create group',
          errorData?.error || 'Something went wrong. Please try again.',
        );
      }
    } catch {
      Alert.alert(
        'Network error',
        'Could not reach the server. Check your connection and try again.',
      );
    } finally {
      setCreating(false);
    }
  }, [canCreate, session?.access_token, creating, groupName, selectedUsers, dispatch, navigation]);

  // Header "Create" button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleCreate}
          disabled={!canCreate || creating}
          accessibilityRole="button"
          accessibilityLabel="Create group chat"
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          {creating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              style={{
                fontSize: 17,
                fontWeight: '600',
                color: canCreate ? colors.primary : colors.textTertiary,
              }}
            >
              Create
            </Text>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, canCreate, creating, colors, handleCreate]);

  // Build unique user list from participants, excluding self and blocked users
  const users = useMemo(() => {
    const currentUserId = session?.user?.id;
    const blockedIds = new Set(blockedUsers.map(b => b.blockedId));
    const seen = new Map<string, UniqueUser>();

    for (const p of participants) {
      if (p.userId === currentUserId || blockedIds.has(p.userId)) continue;
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

  const selectedIds = useMemo(
    () => new Set(selectedUsers.map(u => u.userId)),
    [selectedUsers]
  );

  const toggleUser = (user: UniqueUser) => {
    setSelectedUsers(prev =>
      prev.some(u => u.userId === user.userId)
        ? prev.filter(u => u.userId !== user.userId)
        : [...prev, user]
    );
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.userId !== userId));
  };

  const renderUser = ({ item }: { item: UniqueUser }) => {
    const isSelected = selectedIds.has(item.userId);
    return (
      <TouchableOpacity
        style={[styles.userRow, { backgroundColor: colors.surface }]}
        onPress={() => toggleUser(item)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} ${item.userName}`}
      >
        <Avatar
          imageUrl={item.userPhotoUrl}
          name={item.userName}
          size={44}
        />
        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
          {item.userName || 'Unknown User'}
        </Text>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={isSelected ? colors.primary : colors.textTertiary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Group name input */}
      <View style={[styles.nameContainer, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.nameInput, { color: colors.text }]}
          placeholder="Group name"
          placeholderTextColor={colors.textTertiary}
          value={groupName}
          onChangeText={setGroupName}
          autoCapitalize="words"
          autoCorrect={false}
          accessibilityLabel="Group name"
        />
      </View>

      {/* Selected users chips */}
      {selectedUsers.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {selectedUsers.map(u => (
            <TouchableOpacity
              key={u.userId}
              style={[styles.chip, { backgroundColor: colors.primary + '20' }]}
              onPress={() => removeUser(u.userId)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${u.userName}`}
            >
              <Text style={[styles.chipText, { color: colors.primary }]} numberOfLines={1}>
                {u.userName}
              </Text>
              <Ionicons name="close-circle" size={16} color={colors.primary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Search bar */}
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
  nameContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
  },
  nameInput: {
    fontSize: 16,
    height: 44,
  },
  chipsScroll: {
    maxHeight: 44,
    marginTop: 4,
  },
  chipsContent: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    height: 32,
    borderRadius: 16,
    gap: 4,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 120,
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
