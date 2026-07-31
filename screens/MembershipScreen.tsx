import React, { useContext } from 'react';
import {
  Alert,
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
import { useMembership } from '../context/MembershipContext';
import { getBillingAdapter } from '../services/billing';
import { PRO_FEATURES } from '../constants/membership';

const ROLE_LABELS = {
  member: 'Member',
  team_manager: 'Team Manager',
  organization_admin: 'Organization Manager',
  platform_admin: 'Internal Administrator',
} as const;

export default function MembershipScreen() {
  const { colorScheme } = useContext(ThemeContext);
  const navigation = useNavigation<any>();
  const colors = getColors(colorScheme);
  const { membership, isLoading, refreshMembership } = useMembership();
  const billing = getBillingAdapter();
  const isPro = membership.tier !== 'free';
  const tierLabel =
    membership.tier === 'sponsored_pro'
      ? 'Sponsored Pro'
      : membership.tier === 'individual_pro'
        ? 'Individual Pro'
        : 'Free';

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshMembership}
          tintColor={colors.primary}
        />
      }
    >
      <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
        <Ionicons
          name={isPro ? 'sparkles' : 'person-outline'}
          size={32}
          color={isPro ? '#F59E0B' : colors.primary}
        />
        <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
          CURRENT MEMBERSHIP
        </Text>
        <Text style={[styles.title, { color: colors.text }]}>{tierLabel}</Text>
        {membership.expiresAt ? (
          <Text style={[styles.detail, { color: colors.textSecondary }]}>
            Access through {new Date(membership.expiresAt).toLocaleDateString()}
          </Text>
        ) : null}
        {membership.tier === 'sponsored_pro' &&
        membership.storeSubscriptionActive ? (
          <Text style={[styles.detail, { color: colors.textSecondary }]}>
            Your organization provides Pro. You also have an active store
            subscription that you can manage below.
          </Text>
        ) : null}
      </View>

      {membership.organizations.map(organization => (
        <View
          key={organization.organizationId}
          style={[styles.organizationCard, { borderColor: colors.border }]}
        >
          <Ionicons name="people-outline" size={20} color={colors.primary} />
          <View style={styles.organizationText}>
            <Text style={[styles.organizationName, { color: colors.text }]}>
              {organization.organizationName}
            </Text>
            <Text style={[styles.detail, { color: colors.textSecondary }]}>
              {organization.roles
                .map(role => ROLE_LABELS[role])
                .join(' · ')}
            </Text>
          </View>
        </View>
      ))}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Pro includes
      </Text>
      {PRO_FEATURES.map(feature => (
        <View key={feature} style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
          <Text style={[styles.featureText, { color: colors.text }]}>
            {feature}
          </Text>
        </View>
      ))}

      {!isPro ? (
        <>
          <Text style={[styles.storeNote, { color: colors.textSecondary }]}>
            Subscription options and localized prices are provided by the App
            Store or Google Play.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Paywall')}
          >
            <Text style={styles.primaryButtonText}>See Pro options</Text>
          </TouchableOpacity>
        </>
      ) : membership.tier === 'individual_pro' ||
        membership.storeSubscriptionActive ? (
        <TouchableOpacity
          style={[styles.manageButton, { borderColor: colors.border }]}
          onPress={async () => {
            try {
              await billing.openSubscriptionManagement();
            } catch {
              Alert.alert('Unable to Open', 'Subscription management is unavailable right now.');
            }
          }}
        >
          <Text style={[styles.manageButtonText, { color: colors.primary }]}>
            Manage Subscription
          </Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  statusCard: { alignItems: 'center', borderRadius: 18, padding: 24 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 12,
  },
  title: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  detail: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  organizationCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    marginTop: 12,
    padding: 16,
  },
  organizationText: { flex: 1, marginLeft: 12 },
  organizationName: { fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 28 },
  featureRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
  featureText: { flex: 1, fontSize: 15, lineHeight: 21, marginLeft: 10 },
  storeNote: { fontSize: 13, lineHeight: 19, marginTop: 16, textAlign: 'center' },
  primaryButton: { borderRadius: 12, marginTop: 16, paddingHorizontal: 22, paddingVertical: 14 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  manageButton: { borderRadius: 12, borderWidth: 1, marginTop: 20, paddingHorizontal: 22, paddingVertical: 14 },
  manageButtonText: { fontSize: 15, fontWeight: '700' },
});
