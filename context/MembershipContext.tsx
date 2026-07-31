import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from './AuthContext';
import {
  fetchMembership,
  syncPurchasedMembership,
} from '../services/membership';
import {
  MembershipState,
  PRO_CAPABILITIES,
  SAFE_FREE_MEMBERSHIP,
} from '../types/membership';
import { getBillingAdapter } from '../services/billing';

interface MembershipContextValue {
  membership: MembershipState;
  isLoading: boolean;
  refreshMembership: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextValue | undefined>(
  undefined
);

export function MembershipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, user } = useAuth();
  const [membership, setMembership] = useState(SAFE_FREE_MEMBERSHIP);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMembership = useCallback(async () => {
    const token = session?.access_token;
    if (!token) {
      await getBillingAdapter().configure(null).catch(() => undefined);
      setMembership(SAFE_FREE_MEMBERSHIP);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const billing = getBillingAdapter();
      await billing.configure(user?.id ?? null);
      const [serverResult, billingResult] = await Promise.allSettled([
        fetchMembership(token),
        billing.getCustomerState(),
      ]);
      let serverMembership =
        serverResult.status === 'fulfilled'
          ? serverResult.value
          : SAFE_FREE_MEMBERSHIP;
      const storePro =
        billingResult.status === 'fulfilled' && billingResult.value.proActive;
      const storeSubscriptionExpiresAt =
        billingResult.status === 'fulfilled'
          ? billingResult.value.expirationDate
          : undefined;

      if (storePro && serverMembership.tier === 'free') {
        try {
          await syncPurchasedMembership(token);
          serverMembership = await fetchMembership(token);
        } catch {
          // RevenueCat's signed customer state can keep the paywall out of the
          // way while the verified webhook or next foreground refresh catches
          // the server up. Paid writes still fail closed on the backend.
        }
      }

      if (storePro && serverMembership.tier === 'free') {
        setMembership({
          ...serverMembership,
          tier: 'individual_pro',
          source:
            billing.mode === 'mock'
              ? 'mock'
              : Platform.OS === 'ios'
                ? 'apple'
                : 'google',
          expiresAt: storeSubscriptionExpiresAt,
          storeSubscriptionActive: true,
          storeSubscriptionExpiresAt,
          capabilities: PRO_CAPABILITIES,
        });
      } else {
        setMembership({
          ...serverMembership,
          storeSubscriptionActive: storePro,
          storeSubscriptionExpiresAt,
        });
      }
    } catch {
      // Capabilities fail closed. Free participation remains available while
      // paid writes wait for an authoritative server response.
      setMembership(SAFE_FREE_MEMBERSHIP);
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, user?.id]);

  useEffect(() => {
    refreshMembership();
  }, [user?.id, refreshMembership]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshMembership();
    });
    return () => subscription.remove();
  }, [refreshMembership]);

  useEffect(() => {
    let unsubscribe: () => void = () => undefined;
    let active = true;
    const billing = getBillingAdapter();
    billing
      .configure(user?.id ?? null)
      .then(() => {
        if (!active) return;
        unsubscribe = billing.addCustomerStateListener(() => {
          void refreshMembership();
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [refreshMembership, user?.id]);

  const value = useMemo(
    () => ({ membership, isLoading, refreshMembership }),
    [membership, isLoading, refreshMembership]
  );

  return (
    <MembershipContext.Provider value={value}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership(): MembershipContextValue {
  const context = useContext(MembershipContext);
  if (!context) {
    throw new Error('useMembership must be used within MembershipProvider');
  }
  return context;
}
