import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBillingAdapter } from '../../services/billing';

describe('billing adapter native behavior', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns one stable adapter instance for the application lifetime', () => {
    expect(getBillingAdapter()).toBe(getBillingAdapter());
    expect(getBillingAdapter().mode).toBe('mock');
  });

  it('requires an authenticated user before purchasing', async () => {
    const billing = getBillingAdapter();
    await billing.configure(null);

    await expect(billing.purchase('mock.tribetracker.pro.monthly')).rejects.toThrow(
      'Sign in before purchasing.'
    );
  });

  it('keeps mock entitlements isolated by authenticated user', async () => {
    const billing = getBillingAdapter();
    await billing.configure('paid-user');
    await billing.purchase('mock.tribetracker.pro.monthly');
    await expect(billing.getCustomerState()).resolves.toEqual(
      expect.objectContaining({ proActive: true })
    );

    await billing.configure('free-user');
    await expect(billing.getCustomerState()).resolves.toEqual({
      proActive: false,
    });

    await billing.configure('paid-user');
    await expect(billing.restore()).resolves.toEqual(
      expect.objectContaining({ proActive: true })
    );
  });

  it('notifies active listeners after a successful purchase and unsubscribes cleanly', async () => {
    const billing = getBillingAdapter();
    const listener = jest.fn();
    await billing.configure('listener-user');
    const unsubscribe = billing.addCustomerStateListener(listener);

    await billing.purchase('mock.tribetracker.pro.annual');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ proActive: true })
    );

    unsubscribe();
    await billing.purchase('mock.tribetracker.pro.annual');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
