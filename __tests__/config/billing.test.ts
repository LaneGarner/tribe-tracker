describe('RevenueCat platform configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, NODE_ENV: 'production' };
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'ios-public';
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY = 'android-public';
    process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY = 'web-public';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('selects an explicit key for each production platform', () => {
    const { revenueCatApiKeyForPlatform } = require('../../config/billing');
    expect(revenueCatApiKeyForPlatform('ios', {}, process.env)).toBe('ios-public');
    expect(revenueCatApiKeyForPlatform('android', {}, process.env)).toBe('android-public');
    expect(revenueCatApiKeyForPlatform('web', {}, process.env)).toBe('web-public');
  });

  it('never falls back from web to an Android key', () => {
    delete process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY;
    const { revenueCatApiKeyForPlatform } = require('../../config/billing');
    expect(revenueCatApiKeyForPlatform('web', {}, {})).toBe('');
  });

  it('rejects unknown platforms instead of treating them as Android', () => {
    const { revenueCatApiKeyForPlatform } = require('../../config/billing');
    expect(revenueCatApiKeyForPlatform('windows', {}, process.env)).toBe('');
  });
});
