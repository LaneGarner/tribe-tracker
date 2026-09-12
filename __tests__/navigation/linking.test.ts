jest.mock('expo-linking', () => ({ createURL: () => 'tribetracker:///' }));

import { getPathFromState, getStateFromPath } from '@react-navigation/native';
import { linkingConfig } from '../../navigation/linking';

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
