import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootStackParamList } from '../types';
import { BillingProduct } from '../services/billing/types';
import {
  BillingPurchaseCancelledError,
  getBillingAdapter,
} from '../services/billing';
import { useAuth } from '../context/AuthContext';
import { useMembership } from '../context/MembershipContext';
import { APP_LINKS } from '../config/links';
import { openExternalLink } from '../utils/openExternalLink';
import { syncPurchasedMembership } from '../services/membership';
import { PRO_FEATURES } from '../constants/membership';

const FEATURE_COPY: Record<string, { title: string; subtitle: string }> = {
  canCreatePersonalChallenge: {
    title: 'Keep creating with Pro',
    subtitle:
      'Free includes one active self-created challenge. Pro removes that limit.',
  },
  canGenerateChallenge: {
    title: 'Create with AI on Pro',
    subtitle:
      'Generate an editable challenge draft, then review every detail before publishing.',
  },
  canUseEnhancedAccountability: {
    title: 'Unlock personalized coaching',
    subtitle:
      'Get coaching insights based on your challenge progress with Pro.',
  },
  canViewAnalytics: {
    title: 'Unlock deeper insights',
    subtitle:
      'See advanced analytics and full history with Pro.',
  },
};

export default function PaywallScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'Paywall'>>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user, getAccessToken } = useAuth();
  const { refreshMembership } = useMembership();
  const [products, setProducts] = useState<BillingProduct[]>([]);
  const [storeMessage, setStoreMessage] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const billing = getBillingAdapter();
  const isDark = colorScheme === 'dark';
  const panelColor = isDark
    ? 'rgba(255,255,255,0.05)'
    : 'rgba(255,255,255,0.9)';
  const annualPanelColor = isDark
    ? 'rgba(59,130,246,0.14)'
    : '#EEF4FF';
  const copy = route.params?.feature
    ? FEATURE_COPY[route.params.feature]
    : undefined;

  const verifyPurchase = async () => {
    const token = getAccessToken();
    if (!token) return false;
    try {
      const state = await syncPurchasedMembership(token);
      return state.active;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let active = true;
    setStoreMessage(null);
    billing
      .configure(user?.id ?? null)
      .then(() => billing.getProducts())
      .then(value => {
        if (active) setProducts(value);
      })
      .catch(error => {
        if (active) {
          setProducts([]);
          setStoreMessage(
            error instanceof Error
              ? error.message
              : 'Store subscription options are temporarily unavailable.'
          );
        }
      });
    return () => {
      active = false;
    };
  }, [billing, user?.id]);

  const purchase = async (product: BillingProduct) => {
    setWorking(product.id);
    try {
      await billing.purchase(product.id);
      const verified = await verifyPurchase();
      await refreshMembership();
      Alert.alert(
        verified ? 'Pro Active' : 'Purchase Successful',
        verified
          ? 'Your Pro features are ready.'
          : 'Your purchase is complete. TribeTracker is finishing the secure account update now.',
        [
        { text: 'Continue', onPress: () => navigation.goBack() },
        ]
      );
    } catch (error) {
      if (error instanceof BillingPurchaseCancelledError) return;
      Alert.alert(
        'Purchase Unavailable',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setWorking(null);
    }
  };

  const restore = async () => {
    setWorking('restore');
    try {
      const state = await billing.restore();
      const verified = state.proActive ? await verifyPurchase() : false;
      await refreshMembership();
      Alert.alert(
        state.proActive ? 'Purchases Restored' : 'Nothing to Restore',
        state.proActive
          ? verified
            ? 'Your Pro access has been restored.'
            : 'Your purchase was found. TribeTracker is finishing the secure account update now.'
          : 'No active Pro subscription was found for this store account.'
      );
    } catch {
      Alert.alert('Restore Failed', 'Unable to restore purchases right now.');
    } finally {
      setWorking(null);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          isDark
            ? ['#05070B', '#0A0D13', '#050505']
            : ['#F1F6FF', '#FFFFFF', '#F8FAFC']
        }
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.logoTile,
            {
              backgroundColor: panelColor,
              borderColor: isDark
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(15,23,42,0.08)',
            },
          ]}
        >
          <Image
            source={require('../assets/images/TT-logo.png')}
            style={[
              styles.logo,
              { tintColor: isDark ? '#FFFFFF' : '#000000' },
            ]}
            accessibilityIgnoresInvertColors
          />
        </View>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={27} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            {copy?.title || 'Unlock Pro'}
          </Text>
        </View>
        {copy?.subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {copy.subtitle}
          </Text>
        ) : null}

        <View
          style={[
            styles.benefits,
            { backgroundColor: panelColor, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            EVERYTHING IN PRO
          </Text>
          {PRO_FEATURES.map((benefit, index) => (
            <View
              key={benefit}
              style={[
                styles.benefitRow,
                index < PRO_FEATURES.length - 1
                  ? { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }
                  : null,
              ]}
            >
              <View
                style={[
                  styles.checkCircle,
                  {
                    backgroundColor: isDark
                      ? 'rgba(96,165,250,0.16)'
                      : '#E8F1FF',
                  },
                ]}
              >
                <Ionicons name="checkmark" size={15} color={colors.primary} />
              </View>
              <Text style={[styles.benefitText, { color: colors.text }]}>
                {benefit}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.planList}>
          {products.map(product => {
            const isAnnual = product.period === 'annual';
            return (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.product,
                  {
                    backgroundColor: isAnnual
                      ? annualPanelColor
                      : panelColor,
                    borderColor: isAnnual ? colors.primary : colors.border,
                    borderWidth: isAnnual ? 1.5 : StyleSheet.hairlineWidth,
                  },
                ]}
                disabled={working !== null}
                onPress={() => purchase(product)}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={`${product.title}, ${product.localizedPrice}, billed ${product.period}${isAnnual ? ', best value' : ''}`}
                accessibilityHint="Starts the store purchase confirmation"
                accessibilityState={{ disabled: working !== null }}
              >
                <View>
                  <View style={styles.productHeading}>
                    <Text style={[styles.productTitle, { color: colors.text }]}>
                      {product.title}
                    </Text>
                    {isAnnual ? (
                      <Text
                        style={[
                          styles.valueBadge,
                          {
                            backgroundColor: isDark
                              ? 'rgba(96,165,250,0.18)'
                              : '#DCEAFF',
                            color: colors.primary,
                          },
                        ]}
                      >
                        BEST VALUE
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.productPeriod, { color: colors.textSecondary }]}>
                    Billed {product.period}
                  </Text>
                </View>
                {working === product.id ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <View style={styles.priceGroup}>
                    <Text style={[styles.price, { color: colors.primary }]}>
                      {product.localizedPrice}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {products.length === 0 ? (
          <Text style={[styles.unavailable, { color: colors.textSecondary }]}>
            {storeMessage ||
              'Store subscription options are not configured in this build.'}
          </Text>
        ) : null}

        <TouchableOpacity disabled={working !== null} onPress={restore} style={styles.restore}>
          <Text style={[styles.restoreText, { color: colors.primary }]}>
            {working === 'restore' ? 'Restoring…' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={working !== null}
          onPress={() => navigation.goBack()}
          style={styles.continueFree}
          accessibilityRole="button"
        >
          <Text style={[styles.continueFreeText, { color: colors.text }]}>
            Continue with Free
          </Text>
        </TouchableOpacity>
        <Text style={[styles.finePrint, { color: colors.textTertiary }]}>
          Your selected monthly or annual subscription automatically renews at
          the localized store price unless canceled. Payment is charged to your{' '}
          {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} account when you
          confirm. Manage or cancel anytime from Membership or your store
          account. Sponsored Pro is assigned by an organization and does not
          require an individual purchase.
        </Text>
        <Text style={[styles.freeIncludes, { color: colors.textSecondary }]}>
          Free includes unlimited joining, check-ins, leaderboards, current
          streaks, basic chat, basic badges, and one active self-created challenge.
        </Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => openExternalLink(APP_LINKS.terms)}>
            <Text style={[styles.legalLink, { color: colors.primary }]}>Terms</Text>
          </TouchableOpacity>
          <Text style={[styles.legalDivider, { color: colors.textTertiary }]}>·</Text>
          <TouchableOpacity onPress={() => openExternalLink(APP_LINKS.privacy)}>
            <Text style={[styles.legalLink, { color: colors.primary }]}>Privacy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { backgroundColor: 'transparent' },
  content: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 48,
  },
  logoTile: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    height: 92,
    justifyContent: 'center',
    marginBottom: 22,
    width: 92,
  },
  logo: { height: 62, resizeMode: 'contain', width: 62 },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.6, marginLeft: 10 },
  subtitle: { fontSize: 15, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  benefits: {
    alignSelf: 'stretch',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 22,
    marginTop: 26,
    paddingHorizontal: 18,
    paddingTop: 15,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  benefitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 48,
    paddingVertical: 8,
  },
  checkCircle: {
    alignItems: 'center',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  benefitText: { flex: 1, fontSize: 15, fontWeight: '600', marginLeft: 12 },
  planList: { alignSelf: 'stretch' },
  product: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 86,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  productTitle: { fontSize: 17, fontWeight: '700' },
  productHeading: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  valueBadge: {
    borderRadius: 999,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  productPeriod: { fontSize: 13, marginTop: 3 },
  priceGroup: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  price: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  unavailable: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  restore: { padding: 14 },
  restoreText: { fontSize: 15, fontWeight: '700' },
  continueFree: { paddingHorizontal: 14, paddingVertical: 10 },
  continueFreeText: { fontSize: 15, fontWeight: '700' },
  finePrint: { fontSize: 12, lineHeight: 17, marginTop: 8, textAlign: 'center' },
  freeIncludes: { fontSize: 12, lineHeight: 17, marginTop: 12, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', marginTop: 12 },
  legalLink: { fontSize: 13, fontWeight: '600', padding: 6 },
  legalDivider: { paddingVertical: 6 },
});
