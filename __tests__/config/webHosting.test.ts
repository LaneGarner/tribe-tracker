import fs from 'node:fs';
import path from 'node:path';

const config = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../vercel.json'), 'utf8')
);

describe('consumer web hosting contract', () => {
  it('exports Expo web output from the consumer repository', () => {
    expect(config).toMatchObject({
      buildCommand: 'npm run build:web',
      outputDirectory: 'dist',
    });
  });

  it.each([
    '/challenge/5ac52e2f-c8de-4bbb-b9fd-1f27f47cc201',
    '/invite/ABC123',
    '/organization-invite/token-123',
    '/reset-password',
    '/login',
  ])('serves the SPA shell for a direct request to %s', route => {
    const fallback = config.rewrites.find(
      (rewrite: { source: string; destination: string }) =>
        rewrite.source === '/(.*)' && rewrite.destination === '/index.html'
    );
    expect(fallback).toBeDefined();
    expect(route).toMatch(/^\//);
  });

  it('keeps real exported assets ahead of the SPA rewrite and immutable', () => {
    // Vercel gives filesystem matches precedence over rewrites. These headers
    // also characterize the two Expo export asset locations we must preserve.
    expect(config.headers).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: '/_expo/static/(.*)' }),
      expect.objectContaining({ source: '/assets/(.*)' }),
    ]));
  });

  it('marks the authenticated app noindex and permits required billing/auth connections', () => {
    const globalHeaders = config.headers.find(
      (entry: { source: string }) => entry.source === '/(.*)'
    ).headers as Array<{ key: string; value: string }>;
    const byName = Object.fromEntries(globalHeaders.map(header => [header.key, header.value]));

    expect(byName['X-Robots-Tag']).toContain('noindex');
    expect(byName['X-Frame-Options']).toBe('DENY');
    expect(byName['Content-Security-Policy']).toEqual(expect.stringContaining("frame-ancestors 'none'"));
    expect(byName['Content-Security-Policy']).toEqual(expect.stringContaining('https://*.supabase.co'));
    expect(byName['Content-Security-Policy']).toEqual(expect.stringContaining('wss://*.supabase.co'));
    expect(byName['Content-Security-Policy']).toEqual(expect.stringContaining('https://api.revenuecat.com'));
    expect(byName['Content-Security-Policy']).toEqual(expect.stringContaining('https://js.stripe.com'));
  });
});
