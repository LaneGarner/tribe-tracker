import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Challenge,
  ChallengeParticipant,
  HabitCheckin,
  UserProfile,
  BadgeDefinition,
  UserBadge,
  Conversation,
  ChatMessage,
  BlockedUser,
} from '../types';
import { API_URL } from '../config/api';

// Storage keys
const KEYS = {
  CHALLENGES: 'tribe_challenges',
  PARTICIPANTS: 'tribe_participants',
  CHECKINS: 'tribe_checkins',
  PROFILE: 'tribe_profile',
  CHALLENGE_ORDER: 'tribe_challenge_order',
  LAST_SYNC: 'tribe_last_sync',
  PENDING_SYNC: 'tribe_pending_sync',
  THEME_MODE: 'tribe_theme_mode',
  BADGE_DEFINITIONS: 'tribe_badge_definitions',
  BADGES: 'tribe_badges',
  CONVERSATIONS: 'tribe_conversations',
  MESSAGES: 'tribe_messages',
  BLOCKED_USERS: 'tribe_blocked_users',
  FEATURE_FLAGS: 'tribe_feature_flags',
  NOTIFICATION_PROMPT_SHOWN: 'tribe_notification_prompt_shown',
  WIZARD_SEEN: 'tribe_wizard_seen',
  COACH_INSIGHTS: 'tribe_coach_insights',
};

// Challenge storage functions
export const saveChallenges = async (challenges: Challenge[]) => {
  try {
    await AsyncStorage.setItem(KEYS.CHALLENGES, JSON.stringify(challenges));
  } catch (error) {
    console.error('Error saving challenges:', error);
  }
};

export const loadChallenges = async (): Promise<Challenge[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.CHALLENGES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading challenges:', error);
    return [];
  }
};

// Participants storage functions
export const saveParticipants = async (participants: ChallengeParticipant[]) => {
  try {
    await AsyncStorage.setItem(KEYS.PARTICIPANTS, JSON.stringify(participants));
  } catch (error) {
    console.error('Error saving participants:', error);
  }
};

export const loadParticipants = async (): Promise<ChallengeParticipant[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.PARTICIPANTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading participants:', error);
    return [];
  }
};

// Checkins storage functions
export const saveCheckins = async (checkins: HabitCheckin[]) => {
  try {
    await AsyncStorage.setItem(KEYS.CHECKINS, JSON.stringify(checkins));
  } catch (error) {
    console.error('Error saving checkins:', error);
  }
};

export const loadCheckins = async (): Promise<HabitCheckin[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.CHECKINS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading checkins:', error);
    return [];
  }
};

// Profile storage functions
export const saveProfile = async (profile: UserProfile) => {
  try {
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving profile:', error);
  }
};

export const loadProfile = async (): Promise<UserProfile | null> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.PROFILE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
};

// Challenge order storage
export const saveChallengeOrder = async (order: string[]) => {
  try {
    await AsyncStorage.setItem(KEYS.CHALLENGE_ORDER, JSON.stringify(order));
  } catch (error) {
    console.error('Error saving challenge order:', error);
  }
};

export const loadChallengeOrder = async (): Promise<string[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.CHALLENGE_ORDER);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading challenge order:', error);
    return [];
  }
};

// Theme storage functions
export const saveThemeMode = async (themeMode: string) => {
  try {
    await AsyncStorage.setItem(KEYS.THEME_MODE, themeMode);
  } catch (error) {
    console.error('Error saving theme mode:', error);
  }
};

export const loadThemeMode = async (): Promise<string> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.THEME_MODE);
    return data || 'system';
  } catch (error) {
    console.error('Error loading theme mode:', error);
    return 'system';
  }
};

// Sync timestamp storage
export const saveLastSyncTime = async (time: string) => {
  try {
    await AsyncStorage.setItem(KEYS.LAST_SYNC, time);
  } catch (error) {
    console.error('Error saving last sync time:', error);
  }
};

export const loadLastSyncTime = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(KEYS.LAST_SYNC);
  } catch (error) {
    console.error('Error loading last sync time:', error);
    return null;
  }
};

// Pending sync queue storage
export interface PendingSyncItem {
  type: 'challenge' | 'participant' | 'checkin' | 'profile' | 'badges';
  action: 'create' | 'update' | 'delete';
  data: unknown;
  timestamp: string;
}

export const savePendingSync = async (items: PendingSyncItem[]) => {
  try {
    await AsyncStorage.setItem(KEYS.PENDING_SYNC, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving pending sync:', error);
  }
};

export const loadPendingSync = async (): Promise<PendingSyncItem[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.PENDING_SYNC);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading pending sync:', error);
    return [];
  }
};

export const addToPendingSync = async (item: PendingSyncItem) => {
  const items = await loadPendingSync();
  items.push(item);
  await savePendingSync(items);
};

export const clearPendingSync = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.PENDING_SYNC);
  } catch (error) {
    console.error('Error clearing pending sync:', error);
  }
};

// Clear all user data (on logout)
export const clearUserData = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(KEYS.CHALLENGES),
      AsyncStorage.removeItem(KEYS.PARTICIPANTS),
      AsyncStorage.removeItem(KEYS.CHECKINS),
      AsyncStorage.removeItem(KEYS.PROFILE),
      AsyncStorage.removeItem(KEYS.CHALLENGE_ORDER),
      AsyncStorage.removeItem(KEYS.LAST_SYNC),
      AsyncStorage.removeItem(KEYS.PENDING_SYNC),
      AsyncStorage.removeItem(KEYS.BADGE_DEFINITIONS),
      AsyncStorage.removeItem(KEYS.BADGES),
      AsyncStorage.removeItem(KEYS.CONVERSATIONS),
      AsyncStorage.removeItem(KEYS.MESSAGES),
      AsyncStorage.removeItem(KEYS.BLOCKED_USERS),
      AsyncStorage.removeItem(KEYS.WIZARD_SEEN),
      AsyncStorage.removeItem(KEYS.COACH_INSIGHTS),
    ]);
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
};

// Clear chat data locally and from the server
export const clearChatData = async (token?: string | null): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([KEYS.CONVERSATIONS, KEYS.MESSAGES, KEYS.BLOCKED_USERS]);

    if (token) {
      const response = await fetch(`${API_URL}/api/conversations`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        console.error('Failed to clear chat data on server:', response.status);
      }
    }
  } catch (error) {
    console.error('Error clearing chat data:', error);
  }
};

// Coach insights cache (personal AI coach on CoachingScreen).
// Invalidated from syncMiddleware whenever the user performs a check-in mutation
// so stale summaries don't linger after fresh data lands.
export interface CoachInsightsCacheEntry {
  coaching: Array<{
    challengeId: string;
    opener: string;
    observations: string[];
    gapRead: string;
    thisWeekAsk: string;
  }>;
  errors: Array<{ challengeId: string; reason: string }>;
  generatedAt: string;
}

export const saveCoachInsights = async (entry: CoachInsightsCacheEntry) => {
  try {
    await AsyncStorage.setItem(KEYS.COACH_INSIGHTS, JSON.stringify(entry));
  } catch (error) {
    console.error('Error saving coach insights:', error);
  }
};

export const loadCoachInsights = async (): Promise<CoachInsightsCacheEntry | null> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.COACH_INSIGHTS);
    return data ? (JSON.parse(data) as CoachInsightsCacheEntry) : null;
  } catch (error) {
    console.error('Error loading coach insights:', error);
    return null;
  }
};

export const clearCoachInsights = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.COACH_INSIGHTS);
  } catch (error) {
    console.error('Error clearing coach insights:', error);
  }
};

// Clear all app data including theme
export const clearAllAppData = async (): Promise<void> => {
  try {
    await clearUserData();
    await AsyncStorage.removeItem(KEYS.THEME_MODE);
  } catch (error) {
    console.error('Error clearing all app data:', error);
  }
};

// Badge definitions storage functions
export const saveBadgeDefinitions = async (definitions: BadgeDefinition[]) => {
  try {
    await AsyncStorage.setItem(KEYS.BADGE_DEFINITIONS, JSON.stringify(definitions));
  } catch (error) {
    console.error('Error saving badge definitions:', error);
  }
};

export const loadBadgeDefinitions = async (): Promise<BadgeDefinition[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.BADGE_DEFINITIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading badge definitions:', error);
    return [];
  }
};

// User badges storage functions
export const saveBadges = async (badges: UserBadge[]) => {
  try {
    await AsyncStorage.setItem(KEYS.BADGES, JSON.stringify(badges));
  } catch (error) {
    console.error('Error saving badges:', error);
  }
};

export const loadBadges = async (): Promise<UserBadge[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.BADGES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading badges:', error);
    return [];
  }
};

// Conversation storage functions
export const saveConversations = async (conversations: Conversation[]) => {
  try {
    await AsyncStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(conversations));
  } catch (error) {
    console.error('Error saving conversations:', error);
  }
};

export const loadConversations = async (): Promise<Conversation[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.CONVERSATIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading conversations:', error);
    return [];
  }
};

// Message storage functions (keyed by conversation, capped at 100 per convo)
export const saveMessages = async (messages: Record<string, ChatMessage[]>) => {
  try {
    const capped: Record<string, ChatMessage[]> = {};
    for (const [convId, msgs] of Object.entries(messages)) {
      capped[convId] = msgs.slice(-100);
    }
    await AsyncStorage.setItem(KEYS.MESSAGES, JSON.stringify(capped));
  } catch (error) {
    console.error('Error saving messages:', error);
  }
};

export const loadMessages = async (): Promise<Record<string, ChatMessage[]>> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.MESSAGES);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error loading messages:', error);
    return {};
  }
};

// Blocked users storage functions
export const saveBlockedUsers = async (blockedUsers: BlockedUser[]) => {
  try {
    await AsyncStorage.setItem(KEYS.BLOCKED_USERS, JSON.stringify(blockedUsers));
  } catch (error) {
    console.error('Error saving blocked users:', error);
  }
};

export const loadBlockedUsers = async (): Promise<BlockedUser[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.BLOCKED_USERS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading blocked users:', error);
    return [];
  }
};

export const setWizardSeen = async (seen: boolean = true): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.WIZARD_SEEN, seen ? 'true' : 'false');
  } catch (error) {
    console.error('Error setting wizard seen flag:', error);
  }
};

export const hasSeenWizard = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(KEYS.WIZARD_SEEN);
    return value === 'true';
  } catch (error) {
    console.error('Error reading wizard seen flag:', error);
    return false;
  }
};
