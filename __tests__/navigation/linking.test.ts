jest.mock('expo-linking', () => ({ createURL: () => 'tribetracker:///' }));

import { getPathFromState, getStateFromPath } from '@react-navigation/native';
import {
  linkingConfig,
  NON_ADDRESSABLE_ROOT_ROUTES,
} from '../../navigation/linking';

describe('primary web route mappings', () => {
  it.each([
    ['Home', '/'],
    ['Discover', '/discover'],
    ['Leaderboard', '/leaderboards'],
    ['Chat', '/chat'],
    ['Menu', '/menu'],
  ] as const)('round trips the %s tab through %s', (tab, path) => {
    const state = {
      routes: [{ name: 'Main', state: { routes: [{ name: tab }] } }],
    };
    expect(getPathFromState(state, linkingConfig)).toBe(path);
    const parsed = getStateFromPath(path, linkingConfig);
    expect(parsed?.routes[0].name).toBe('Main');
    expect(parsed?.routes[0].state?.routes[0].name).toBe(tab);
  });
});

describe('addressable feature routes', () => {
  it.each([
    ['ViewMember', { userId: 'user_123' }, '/members/user_123'],
    ['TaskAnalytics', { challengeId: 'challenge-42' }, '/challenge/challenge-42/analytics'],
    ['Profile', { userId: 'user_123' }, '/profile/user_123'],
    ['PrivacyCenter', undefined, '/settings/privacy'],
    ['Paywall', { feature: 'Advanced analytics' }, '/upgrade/Advanced%20analytics'],
    ['GroupChat', { conversationId: 'group_123', groupName: 'Morning Walkers' }, '/chat/groups/group_123/Morning%20Walkers'],
    ['DirectMessage', { conversationId: 'dm_123', otherUserName: 'Pat Lee' }, '/chat/direct/dm_123/Pat%20Lee'],
    ['NewDm', undefined, '/chat/new/direct'],
    ['NewGroupChat', undefined, '/chat/new/group'],
    ['Coaching', undefined, '/coaching'],
    ['AppsDevices', undefined, '/settings/apps-devices'],
  ] as const)('round trips %s with encoded parameters', (name, params, expectedPath) => {
    const route = params ? { name, params } : { name };
    expect(getPathFromState({ routes: [route] } as any, linkingConfig)).toBe(expectedPath);

    const parsed = getStateFromPath(expectedPath, linkingConfig);
    expect(parsed?.routes[0].name).toBe(name);
    if (params) expect(parsed?.routes[0].params).toEqual(params);
  });

  it('supports canonical routes whose parameters are optional', () => {
    expect(getPathFromState({ routes: [{ name: 'Profile' }] } as any, linkingConfig)).toBe('/profile');
    expect(getPathFromState({ routes: [{ name: 'Paywall' }] } as any, linkingConfig)).toBe('/upgrade');
    expect(getPathFromState({ routes: [{ name: 'DirectMessage', params: { conversationId: 'dm_1' } }] } as any, linkingConfig)).toBe('/chat/direct/dm_1');
  });

  it.each([
    ['/members/', 'ViewMember'],
    ['/challenge//analytics', 'TaskAnalytics'],
    ['/chat/groups/group-only', 'GroupChat'],
    ['/chat/direct/', 'DirectMessage'],
  ])('does not construct %s from a missing required parameter', (path, forbiddenRoute) => {
    const parsed = getStateFromPath(path, linkingConfig);
    expect(parsed?.routes.some(route => route.name === forbiddenRoute)).not.toBe(true);
  });

  it('documents stateful screens that intentionally have no direct URL', () => {
    expect(NON_ADDRESSABLE_ROOT_ROUTES).toEqual(
      expect.objectContaining({
        OrganizationDetail: expect.any(String),
        OnboardingWizard: expect.any(String),
        Chat: expect.any(String),
        CreateChallenge: expect.any(String),
      })
    );
  });
});
