import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  getUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
  UserNotification,
} from '../services/userNotifications';

export default function NotificationInboxScreen() {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { getAccessToken } = useAuth();
  const [items, setItems] = useState<UserNotification[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (nextPage = 1, append = false) => {
    const token = getAccessToken();
    if (!token) return;
    setError('');
    try {
      const result = await getUserNotifications(token, nextPage, 10);
      setItems(current => append ? [...current, ...result.notifications] : result.notifications);
      setPage(result.page);
      setTotal(result.total);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Notifications could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAccessToken]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  useEffect(() => {
    if (!items.some(item => !item.readAt)) return;
    const token = getAccessToken();
    if (!token) return;
    void markAllUserNotificationsRead(token);
  }, [getAccessToken, items]);

  async function openNotification(item: UserNotification) {
    const token = getAccessToken();
    if (token && !item.readAt) {
      await markUserNotificationRead(token, item.id).catch(() => undefined);
      setItems(current => current.map(value =>
        value.id === item.id ? { ...value, readAt: new Date().toISOString() } : value
      ));
    }
  }

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={items.length ? styles.list : styles.emptyContainer}
      data={items}
      keyExtractor={item => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      ListHeaderComponent={error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      ListEmptyComponent={<View style={styles.empty}><Ionicons name="notifications-outline" size={42} color={colors.textTertiary} /><Text style={[styles.emptyTitle, { color: colors.text }]}>No updates yet</Text><Text style={[styles.emptyBody, { color: colors.textSecondary }]}>Access requests, new members, and challenge starts will appear here.</Text></View>}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => void openNotification(item)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={`${item.readAt ? '' : 'Unread. '}${item.title}. ${item.body}`}
        >
          <View style={[styles.icon, { backgroundColor: colors.primary + '18' }]}><Ionicons name={item.type === 'access_requested' ? 'key-outline' : item.type === 'member_joined' ? 'person-add-outline' : 'rocket-outline'} size={21} color={colors.primary} /></View>
          <View style={styles.copy}><View style={styles.titleRow}><Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>{!item.readAt ? <View style={[styles.unread, { backgroundColor: colors.primary }]} /> : null}</View><Text style={[styles.body, { color: colors.textSecondary }]}>{item.body}</Text><Text style={[styles.date, { color: colors.textTertiary }]}>{new Date(item.createdAt).toLocaleString()}</Text></View>
        </Pressable>
      )}
      ListFooterComponent={items.length < total ? <Pressable style={[styles.loadMore, { borderColor: colors.border }]} onPress={() => void load(page + 1, true)} accessibilityRole="button"><Text style={{ color: colors.primary, fontWeight: '700' }}>Load 10 more</Text></Pressable> : null}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flexGrow: 1, padding: 24 },
  card: { minHeight: 96, flexDirection: 'row', gap: 12, padding: 16, borderWidth: 1, borderRadius: 14 },
  icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  copy: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '700' },
  unread: { width: 8, height: 8, borderRadius: 4 },
  body: { marginTop: 4, fontSize: 14, lineHeight: 20 },
  date: { marginTop: 8, fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { marginTop: 14, fontSize: 20, fontWeight: '700' },
  emptyBody: { maxWidth: 320, marginTop: 7, textAlign: 'center', lineHeight: 20 },
  loadMore: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6, borderWidth: 1, borderRadius: 12 },
  error: { marginBottom: 10, textAlign: 'center' },
});
