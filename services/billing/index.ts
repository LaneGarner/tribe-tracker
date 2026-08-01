import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import type {
  CustomerInfo,
  PurchasesError,
  PurchasesPackage,
} from 'react-native-purchases';
import {
  BILLING_MODE,
  REVENUECAT_API_KEY,
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_PRODUCT_IDS,
} from '../../config/billing';
import { BillingAdapter, BillingCustomerState, BillingProduct } from './types';

const MOCK_KEY_PREFIX = 'tribe_mock_billing_';

function purchasesSdk(): typeof import('react-native-purchases').default {
  return require('react-native-purchases').default;
}

function customerState(info: CustomerInfo): BillingCustomerState {
  const entitlement = info.entitlements.active[REVENUECAT_ENTITLEMENT_ID];
  return {
    proActive: Boolean(entitlement?.isActive),
    expirationDate: entitlement?.expirationDate || undefined,
  };
}

function billingPeriod(
  aPackage: PurchasesPackage
): BillingProduct['period'] | null {
  if (
    aPackage.packageType === 'MONTHLY' ||
    aPackage.product.subscriptionPeriod === 'P1M'
  ) {
    return 'monthly';
  }
  if (
    aPackage.packageType === 'ANNUAL' ||
    aPackage.product.subscriptionPeriod === 'P1Y'
  ) {
    return 'annual';
  }
  return null;
}

export class BillingPurchaseCancelledError extends Error {
  constructor() {
    super('Purchase cancelled.');
    this.name = 'BillingPurchaseCancelledError';
  }
}

class MockBillingAdapter implements BillingAdapter {
  readonly mode = 'mock' as const;
  private userId: string | null = null;
  private listeners = new Set<(state: BillingCustomerState) => void>();

  async configure(userId: string | null) {
    this.userId = userId;
  }

  addCustomerStateListener(listener: (state: BillingCustomerState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async getProducts(): Promise<BillingProduct[]> {
    return [
      {
        id: 'mock.tribetracker.pro.monthly',
        period: 'monthly',
        title: 'Pro Monthly',
        localizedPrice: '$4.99',
      },
      {
        id: 'mock.tribetracker.pro.annual',
        period: 'annual',
        title: 'Pro Annual',
        localizedPrice: '$39.99',
      },
    ];
  }

  async getCustomerState(): Promise<BillingCustomerState> {
    if (!this.userId) return { proActive: false };
    const raw = await AsyncStorage.getItem(`${MOCK_KEY_PREFIX}${this.userId}`);
    return raw ? JSON.parse(raw) : { proActive: false };
  }

  async purchase(): Promise<BillingCustomerState> {
    if (!this.userId) throw new Error('Sign in before purchasing.');
    const state = {
      proActive: true,
      expirationDate: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
    await AsyncStorage.setItem(
      `${MOCK_KEY_PREFIX}${this.userId}`,
      JSON.stringify(state)
    );
    this.listeners.forEach((listener) => listener(state));
    return state;
  }

  async restore(): Promise<BillingCustomerState> {
    return this.getCustomerState();
  }

  async openSubscriptionManagement(): Promise<void> {
    return;
  }
}

class RevenueCatBillingAdapter implements BillingAdapter {
  readonly mode = 'revenuecat' as const;
  private configured = false;
  private userId: string | null = null;
  private packages = new Map<string, PurchasesPackage>();
  private managementUrl: string | null = null;

  async configure(userId: string | null) {
    if (!REVENUECAT_API_KEY) {
      throw new Error('Store subscriptions are not configured in this build.');
    }
    const Purchases = purchasesSdk();
    if (!this.configured) {
      if (!userId) return;
      Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID: userId });
      this.configured = true;
      this.userId = userId;
      return;
    }
    if (userId === this.userId) return;
    if (userId) {
      await Purchases.logIn(userId);
    } else if (this.userId) {
      await Purchases.logOut();
    }
    this.userId = userId;
  }

  addCustomerStateListener(listener: (state: BillingCustomerState) => void) {
    if (!this.configured) return () => undefined;
    const Purchases = purchasesSdk();
    let lastSignature: string | null = null;
    const handleUpdate = (info: CustomerInfo) => {
      const state = this.capture(info);
      const signature = `${state.proActive}:${state.expirationDate || ''}`;
      if (signature === lastSignature) return;
      lastSignature = signature;
      listener(state);
    };
    Purchases.addCustomerInfoUpdateListener(handleUpdate);
    return () => Purchases.removeCustomerInfoUpdateListener(handleUpdate);
  }

  async getProducts(): Promise<BillingProduct[]> {
    if (!this.configured) return [];
    const offerings = await purchasesSdk().getOfferings();
    this.packages.clear();
    const expectedProductIds = new Set<string>(
      Object.values(REVENUECAT_PRODUCT_IDS)
    );
    const products = (offerings.current?.availablePackages || [])
      .filter((aPackage) => expectedProductIds.has(aPackage.product.identifier))
      .flatMap<BillingProduct>((aPackage) => {
        const period = billingPeriod(aPackage);
        if (!period) return [];
        this.packages.set(aPackage.identifier, aPackage);
        return [
          {
            id: aPackage.identifier,
            period,
            title: aPackage.product.title,
            localizedPrice: aPackage.product.priceString,
          },
        ];
      })
      .sort(
        (a, b) =>
          (a.period === 'monthly' ? 0 : 1) - (b.period === 'monthly' ? 0 : 1)
      );
    if (products.length !== expectedProductIds.size) {
      this.packages.clear();
      throw new Error(
        'The expected Pro subscription products are unavailable.'
      );
    }
    return products;
  }

  private capture(info: CustomerInfo): BillingCustomerState {
    this.managementUrl = info.managementURL;
    return customerState(info);
  }

  async getCustomerState(): Promise<BillingCustomerState> {
    if (!this.configured) return { proActive: false };
    return this.capture(await purchasesSdk().getCustomerInfo());
  }

  async purchase(productId: string): Promise<BillingCustomerState> {
    if (!this.userId || !this.configured) {
      throw new Error('Sign in before purchasing.');
    }
    let aPackage = this.packages.get(productId);
    if (!aPackage) {
      await this.getProducts();
      aPackage = this.packages.get(productId);
    }
    if (!aPackage) throw new Error('This subscription option is unavailable.');
    try {
      const result = await purchasesSdk().purchasePackage(aPackage);
      return this.capture(result.customerInfo);
    } catch (error) {
      if ((error as PurchasesError)?.userCancelled) {
        throw new BillingPurchaseCancelledError();
      }
      throw error;
    }
  }

  async restore(): Promise<BillingCustomerState> {
    if (!this.configured) {
      throw new Error('Store subscriptions are not configured in this build.');
    }
    return this.capture(await purchasesSdk().restorePurchases());
  }

  async openSubscriptionManagement(): Promise<void> {
    if (this.configured && !this.managementUrl) {
      await this.getCustomerState();
    }
    const fallback =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions?package=com.lanegarner.tribetracker';
    await Linking.openURL(this.managementUrl || fallback);
  }
}

class UnavailableBillingAdapter implements BillingAdapter {
  readonly mode = 'native_unavailable' as const;
  async configure() {}
  addCustomerStateListener() {
    return () => undefined;
  }
  async getProducts() {
    return [];
  }
  async getCustomerState() {
    return { proActive: false };
  }
  async purchase(): Promise<BillingCustomerState> {
    throw new Error('Store subscriptions are not configured in this build.');
  }
  async restore() {
    return this.getCustomerState();
  }
  async openSubscriptionManagement() {
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions?package=com.lanegarner.tribetracker';
    await Linking.openURL(url);
  }
}

let adapter: BillingAdapter | null = null;

export function getBillingAdapter(): BillingAdapter {
  if (!adapter) {
    const useMock =
      process.env.NODE_ENV === 'test' ||
      (__DEV__ && BILLING_MODE.toLowerCase() === 'mock');
    adapter = useMock
      ? new MockBillingAdapter()
      : REVENUECAT_API_KEY
        ? new RevenueCatBillingAdapter()
        : new UnavailableBillingAdapter();
  }
  return adapter;
}
