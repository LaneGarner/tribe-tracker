// Challenge
export interface Challenge {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  creatorName?: string;
  durationDays: number;
  startDate: string;
  endDate?: string;
  habits: string[];
  imageUrl?: string;
  backgroundImageUrl?: string;
  isPublic: boolean;
  inviteCode?: string;
  status: 'upcoming' | 'active' | 'completed';
  participantCount: number;
  updatedAt?: string;
}

// ChallengeParticipant
export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  challengeName?: string;
  userId: string;
  userName: string;
  userEmail?: string; // Optional - only included for own data (privacy)
  userPhotoUrl?: string;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  daysParticipated: number;
  joinDate: string;
  lastCheckinDate?: string;
  updatedAt?: string;
}

// HabitCheckin
export interface HabitCheckin {
  id: string;
  challengeId: string;
  userId: string;
  userName?: string;
  checkinDate: string;
  habitsCompleted: boolean[];
  pointsEarned: number;
  allHabitsCompleted: boolean;
  updatedAt?: string;
}

// Notification Settings
export interface NotificationSettings {
  pushEnabled: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // "HH:mm", default "20:00"
  streakProtectionEnabled: boolean;
  streakProtectionTime: string; // "HH:mm", default "21:00"
  challengeStartEnabled: boolean;
  challengeEndEnabled: boolean;
}

// User Profile
export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  profilePhotoUrl?: string;
  profileBackgroundUrl?: string;
  age?: number;
  height?: string;
  weight?: string;
  city?: string;
  state?: string;
  bio?: string;
  // Privacy settings
  hideEmail: boolean;
  hideAge: boolean;
  hideHeight: boolean;
  hideWeight: boolean;
  hideLocation: boolean;
  hideBio: boolean;
  profileVisible: boolean;
  // Notification settings
  pushNotifications: boolean;
  emailNotifications: boolean;
  notificationSettings?: NotificationSettings;
  // Child account
  isChildAccount: boolean;
  parentUserId?: string;
  parentVerified: boolean;
  verificationToken?: string;
  // Preferences
  challengeOrder: string[];
  // Enterprise (optional)
  role?: string;
  permissionTier?: string;
  districtId?: string;
  updatedAt?: string;
}

// Enterprise entities (included for feature parity)
export interface District {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
}

export interface Building {
  id: string;
  name: string;
  districtId: string;
  address?: string;
  type: 'elementary' | 'middle' | 'high' | 'administrative' | 'other';
}

export interface FeatureToggle {
  id: string;
  districtId: string;
  featureName: string;
  enabled: boolean;
  description?: string;
}

// Badge types
export type BadgeCategory = 'streak' | 'volume' | 'challenge' | 'social' | 'onboarding';

export interface BadgeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: BadgeCategory;
  iconName: string;
  iconColor: string;
  iconColorEnd?: string;
  borderColor: string;
  points: number;
  requirementType: string;
  requirementValue?: number;
  sortOrder: number;
  imageUrl?: string;
}

export interface UserBadge {
  id: string;
  badgeId: string;
  earnedAt: string;
  challengeId?: string;
  metadata?: Record<string, unknown>;
  badge?: BadgeDefinition;
}

// Chat types
export interface Conversation {
  id: string;
  type: 'group' | 'dm';
  challengeId?: string;
  name?: string;
  createdBy: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount: number;
  members: ConversationMember[];
  updatedAt?: string;
}

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  role: 'admin' | 'member';
  status: 'active' | 'pending' | 'rejected';
  lastReadAt?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderPhotoUrl?: string;
  content: string;
  type: 'text' | 'system';
  clientId?: string;
  status: 'sending' | 'sent' | 'failed';
  createdAt: string;
  updatedAt?: string;
}

export interface DmRequest {
  conversationId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhotoUrl?: string;
  createdAt: string;
}

export interface BlockedUser {
  id: string;
  blockedId: string;
  blockedName?: string;
  blockedPhotoUrl?: string;
  createdAt: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ChallengeDetail: { challengeId: string };
  CreateChallenge: { mode?: 'browse' | 'create' | 'join'; challengeId?: string; inviteCode?: string } | undefined;
  ViewMember: { userId: string };
  ManageChild: { childId: string };
  TaskAnalytics: { challengeId: string };
  Profile: { userId?: string } | undefined;
  PrivacyCenter: undefined;
  Notifications: undefined;
  Preferences: undefined;
  Help: undefined;
  Chat: undefined;
  GroupChat: { conversationId: string; challengeName: string };
  DirectMessage: { conversationId: string; otherUserName?: string };
  DmRequests: undefined;
  Coaching: undefined;
  AppsDevices: undefined;
  BuildingManagement: undefined;
  DistrictManagement: undefined;
  StaffManagement: undefined;
  SystemAdmin: undefined;
  FeatureToggles: undefined;
  Badges: undefined;
};

export type TabParamList = {
  Home: undefined;
  Challenges: undefined;
  Leaderboard: { challengeId?: string } | undefined;
  Menu: undefined;
};
