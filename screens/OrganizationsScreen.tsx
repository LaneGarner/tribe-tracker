import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getOrganizations } from '../services/organizations';
import { OrganizationSummary } from '../types/organization';

export default function OrganizationsScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { getAccessToken } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setOrganizations(await getOrganizations(token));
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to load organizations.');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      {loading && organizations.length === 0 ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={[styles.message, { color: colors.error }]}>{error}</Text> : null}
      {!loading && !error && organizations.length === 0 ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          You are not currently part of an organization. Open a secure
          invitation link to join one.
        </Text>
      ) : null}
      {organizations.map(organization => (
        <TouchableOpacity
          key={organization.id}
          style={[styles.card, { backgroundColor: colors.surface }]}
          onPress={() =>
            navigation.navigate('OrganizationDetail', {
              organizationId: organization.id,
              organizationName: organization.name,
              roles: organization.roles,
            })
          }
        >
          <Ionicons name="people-outline" size={26} color={colors.primary} />
          <View style={styles.cardText}>
            <Text style={[styles.name, { color: colors.text }]}>{organization.name}</Text>
            <Text style={[styles.roles, { color: colors.textSecondary }]}>
              {organization.roles.map(role => role.replace(/_/g, ' ')).join(' · ')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  message: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  card: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', marginBottom: 12, padding: 16 },
  cardText: { flex: 1, marginLeft: 12 },
  name: { fontSize: 17, fontWeight: '700' },
  roles: { fontSize: 13, marginTop: 3, textTransform: 'capitalize' },
});
