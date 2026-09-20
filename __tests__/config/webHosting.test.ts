import fs from 'node:fs';
import path from 'node:path';

const config = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../vercel.json'), 'utf8')
);

describe('consumer web hosting contract', () => {
  it('exports Expo web output from the consumer repository', () => {
    expect(config).toMatchObject({
      buildCommand: 'npm run build:web && mv dist/index.html dist/app.html',
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
        rewrite.source === '/(.*)' && rewrite.destination === '/app.html'
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

  it('presents the existing landing, admin, and API through the consumer origin', () => {
    expect(config.rewrites.slice(0, 9)).toEqual([
      { source: '/', destination: '/landing.html' },
      { source: '/admin', destination: 'https://tribe-tracker-backend.vercel.app/admin' },
      {
        source: '/admin/:path*',
        destination: 'https://tribe-tracker-backend.vercel.app/admin/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'https://tribe-tracker-backend.vercel.app/api/:path*',
      },
      { source: '/terms', destination: 'https://tribe-tracker-backend.vercel.app/terms' },
      { source: '/privacy', destination: 'https://tribe-tracker-backend.vercel.app/privacy' },
      { source: '/support', destination: 'https://tribe-tracker-backend.vercel.app/support' },
      {
        source: '/community-guidelines',
        destination: 'https://tribe-tracker-backend.vercel.app/community-guidelines',
      },
      {
        source: '/delete-account',
        destination: 'https://tribe-tracker-backend.vercel.app/delete-account',
      },
    ]);

    expect(config.rewrites.at(-1)).toEqual({
      source: '/(.*)',
      destination: '/app.html',
    });
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
