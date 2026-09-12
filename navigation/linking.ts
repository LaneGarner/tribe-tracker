import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';
import { WEB_BASE_URL } from '../config/links';
import type { RootStackParamList } from '../types';

export const linkingConfig: LinkingOptions<RootStackParamList>['config'] = {
  screens: {
    Auth: 'login',
    Main: {
      path: '',
      screens: {
        Home: '',
        Discover: 'discover',
        Leaderboard: 'leaderboards',
        Chat: 'chat',
        Menu: 'menu',
      },
    },
    CreateChallenge: 'invite/:inviteCode',
    ChallengeDetail: 'challenge/:challengeId',
    OrganizationInvite: 'organization-invite/:token',
    ChangePassword: 'reset-password',
    Profile: 'profile',
    Notifications: 'settings/notifications',
    NotificationInbox: 'notifications',
    Preferences: 'settings/preferences',
    Membership: 'membership',
    Organizations: 'organizations',
    Help: 'help',
    Badges: 'badges',
  },
};

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), WEB_BASE_URL],
  config: linkingConfig,
};
