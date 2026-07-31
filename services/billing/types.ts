export type BillingPeriod = 'monthly' | 'annual';

export interface BillingProduct {
  id: string;
  period: BillingPeriod;
  title: string;
  localizedPrice: string;
}

export interface BillingCustomerState {
  proActive: boolean;
  expirationDate?: string;
}

export interface BillingAdapter {
  readonly mode: 'mock' | 'revenuecat' | 'native_unavailable';
  configure(userId: string | null): Promise<void>;
  addCustomerStateListener(
    listener: (state: BillingCustomerState) => void
  ): () => void;
  getProducts(): Promise<BillingProduct[]>;
  getCustomerState(): Promise<BillingCustomerState>;
  purchase(productId: string): Promise<BillingCustomerState>;
  restore(): Promise<BillingCustomerState>;
  openSubscriptionManagement(): Promise<void>;
}
