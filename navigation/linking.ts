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
    ViewMember: 'members/:userId',
    TaskAnalytics: 'challenge/:challengeId/analytics',
    OrganizationInvite: 'organization-invite/:token',
    ChangePassword: 'reset-password',
    Profile: 'profile/:userId?',
    PrivacyCenter: 'settings/privacy',
    Notifications: 'settings/notifications',
    NotificationInbox: 'notifications',
    Preferences: 'settings/preferences',
    Membership: 'membership',
    Paywall: 'upgrade/:feature?',
    Organizations: 'organizations',
    Help: 'help',
    Badges: 'badges',
    GroupChat: 'chat/groups/:conversationId/:groupName',
    DirectMessage: 'chat/direct/:conversationId/:otherUserName?',
    NewDm: 'chat/new/direct',
    NewGroupChat: 'chat/new/group',
    Coaching: 'coaching',
    AppsDevices: 'settings/apps-devices',
  },
};

export const NON_ADDRESSABLE_ROOT_ROUTES = {
  OrganizationDetail:
    'Requires an authorized organization role and display metadata loaded from the organizations list.',
  OnboardingWizard:
    'A session-controlled workflow whose step and completion state must not be restored from a public URL.',
  Chat:
    'The canonical chat URL is the primary Main/Chat tab; the duplicate root presentation has no separate URL.',
  CreateChallenge:
    'Only authenticated invitation URLs are public; create and edit modes require in-app state and authorization.',
} as const;

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), WEB_BASE_URL],
  config: linkingConfig,
};
