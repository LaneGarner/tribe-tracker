import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';
import { WEB_BASE_URL } from '../config/links';
import type { RootStackParamList } from '../types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), WEB_BASE_URL],
  config: {
    screens: {
      Auth: 'login',
      Main: '',
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
      Chat: 'chat',
      Badges: 'badges',
    },
  },
};
