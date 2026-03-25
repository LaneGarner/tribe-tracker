# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session History

Before starting work, check for previous session context:
- Global context: `~/.claude/context/tribe-tracker/`
- Use `/save-context` before ending sessions to preserve decisions and progress

## Project Overview

Tribe Tracker is a habit challenge app built with React Native (Expo) that lets users create challenges with daily habits, invite others, and compete on leaderboards. It uses an offline-first architecture with background sync.

## Commands

```bash
# Development
npm start                    # Start Expo dev server
npm start -- --clear         # Start with cache cleared
npm run ios                  # Run on iOS simulator
npm run android              # Run on Android emulator
npm run web                  # Start Expo for web

# Building (EAS: appVersionSource=remote, autoIncrement on production)
eas build --platform ios --profile production    # iOS production build
eas build --platform android --profile production # Android production build
eas submit --platform ios                        # Submit to TestFlight
```

## Architecture

### Offline-First Data Flow
```
User Action → Redux Dispatch → Local State Update → AsyncStorage Save → Background API Sync
```

1. Redux actions update local state immediately (optimistic updates)
2. `syncMiddleware.ts` intercepts actions and pushes to backend in background
3. Failed syncs queue to `tribe_pending_sync` in AsyncStorage for retry
4. App works fully offline; syncs when connection available

**Synced actions** (actions that trigger backend sync via middleware):
- Challenge: `addChallenge`, `updateChallenge`, `deleteChallenge`
- Participant: `addParticipant`, `updateParticipant`, `removeParticipant`, `updateParticipantStats`
- Checkin: `addCheckin`, `updateCheckin`, `updateHabitCompletion`, `deleteCheckin`
- Profile: `updateProfile`, `updatePrivacySettings`, `updateChallengeOrder`
- Chat: `addMessage`, `addBlockedUser`, `removeBlockedUser`
- FK violation retries use exponential backoff (500ms, 1s, 2s)

### State Management (Redux Toolkit)

**Store structure:**
- `challenges` - Challenge data (CRUD)
- `participants` - User participation in challenges
- `checkins` - Daily habit check-ins
- `profile` - User profile
- `badges` - Badge definitions, earned badges, level progression (points-based, 10 pts/level)
- `chat` - Conversations, messages, blocked users, read receipts

**Key pattern:** Each slice loads from AsyncStorage on app start via async thunks, then middleware handles backend sync.

### AsyncStorage Keys
- `tribe_challenges`, `tribe_participants`, `tribe_checkins`, `tribe_profile` - Data
- `tribe_badges`, `tribe_conversations`, `tribe_messages`, `tribe_blocked_users` - Chat & badges
- `tribe_challenge_order` - User's custom challenge ordering
- `tribe_pending_sync` - Offline change queue
- `tribe_last_sync` - Last successful sync timestamp
- `tribe_theme_mode` - Theme preference

### Provider Stack (App.tsx)
```
GestureHandlerRootView
  └── Redux Provider
      └── ThemeProvider
          └── AuthProvider
              └── NavigationContainer
```

### Custom Hooks
- `useChatListRealtime` - Supabase real-time subscriptions for chat list (with 5s polling fallback)
- `useConversationRealtime` - Real-time updates for individual conversations
- `useNotificationScheduler` - Orchestrates push notification scheduling (300ms debounce)
- `useAvatarPicker` - Avatar upload/removal via `expo-image-picker` + Supabase Storage
- `useTypingIndicator` - Typing status real-time tracking

### Notification System
- Local push notifications via `expo-notifications`
- Email notifications via Supabase Edge Function (`supabase/functions/notify-join`)
- Types: daily reminders (20:00 default), streak warnings (21:00), challenge start/end (1 day before)
- Android channel: "habit-reminders" with HIGH importance
- Settings stored in profile's `notificationSettings`

### Image Handling
- Supabase Storage buckets: `avatars` (user-specific paths), `challenge-backgrounds`
- Image caching via `expo-image` with `cachePolicy="disk"`
- Cache busting with `Date.now()` query params on URLs
- Upload utilities in `utils/imageUpload.ts`

### Chat System
- Real-time via Supabase `postgres_changes` channel + 5s polling fallback
- Group conversations auto-created with challenges
- DMs use pending/accept/reject flow
- Message deduplication via `client_id`
- Read receipts via `messageCursors`
- Blocked users prevent DM creation

### Backend (`/tribe-tracker-backend`)

Vercel serverless functions with Supabase:
- `/api/challenges` - Challenge CRUD + public discovery (`?isPublic=true`)
- `/api/challenge/:id` - Web page with deep links (HTML)
- `/api/participants` - Participant management (auto-joins group conversation)
- `/api/checkins` - Check-in tracking (upserts on `challenge_id,user_id,checkin_date`)
- `/api/users` - User profiles with privacy masking + blocked user management (`?resource=blocked`)
- `/api/invite/:code` - Invite lookup (JSON) + web share page at `/invite/:code` (HTML)
- `/api/conversations` - Conversation CRUD, DM requests (`?action=dm-requests`)
- `/api/messages` - Message history (cursor-paginated, limit 50/max 100), send, mark read
- `/api/badges` - Badge definitions + earned badges with level calculation

All GET endpoints support `?since=` for timestamp-based sync. Responses include `syncTime`.

Auth: Supabase JWT tokens passed via `Authorization: Bearer <token>`

**Backend shared libs** (`lib/`):
- `auth.ts` - Token verification via `supabaseAdmin.auth.getUser()`
- `supabase.ts` - Admin client (service key, bypasses RLS) + user client (anon key with JWT)
- `transforms.ts` - snake_case ↔ camelCase field mapping for all entity types

**Vercel config**: URL rewrites for `/invite/:code` → `/api/invite/:code` and `/challenge/:id` → `/api/challenge/:id`

### Supabase Edge Functions
- `notify-join` (Deno): Sends HTML email via Gmail OAuth when user joins a challenge. Checks creator has email_notifications enabled. Fire-and-forget (always returns 200).
- Env vars: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_FROM_EMAIL`

### Database (Supabase)
Key tables beyond challenges/participants/checkins/profiles:
- `conversations` - type (group|dm), challenge_id (unique), last_message_at/preview
- `conversation_members` - role (admin|member), status (active|pending|rejected), last_read_at
- `messages` - conversation_id, sender info, content, type (text|system), client_id for dedup
- `blocked_users` - blocker_id, blocked_id

RLS enabled on all tables. Realtime publications on `messages` and `conversation_members`.

## Key Conventions

### File Naming
- Screens: `PascalCaseScreen.tsx` (e.g., `HomeScreen.tsx`)
- Components: `PascalCase.tsx` (e.g., `ChallengeCard.tsx`)
- Redux slices: `camelCaseSlice.ts`
- Utils: `camelCase.ts`

### Styling
- NativeWind (Tailwind) for most styling via `className` prop
- Theme colors from `ThemeContext` for dynamic light/dark mode
- `StyleSheet` only when NativeWind insufficient
- Theme modes: system (default), light, dark — persisted to AsyncStorage
- Colors: primary `#3B82F6`/`#60A5FA`, success `#10B981`, warning `#F59E0B`, error `#EF4444`
- Dark: `#000` bg, `#18181B` surface | Light: `#F9FAFB` bg, `#FFF` surface
- Icons: `lucide-react-native` (primary) + `@expo/vector-icons` (Ionicons)
- Custom fonts: Kanit, Orbitron, Rajdhani, Teko (via `@expo-google-fonts`)

### Navigation
- React Navigation v7 with native-stack
- Type params in `types/index.ts` (`RootStackParamList`, `TabParamList`)
- 4 bottom tabs: Home, Challenges, Leaderboard, Menu
- Modal screens layered above tab navigator (challenge detail, create, profile, chat, etc.)
- Enterprise/admin screens: Coaching, AppsDevices, BuildingManagement, DistrictManagement, StaffManagement, SystemAdmin, FeatureToggles
- Custom glass morphism tab bar with animated pill indicator (BlurView on iOS)
- Deep linking: `tribetracker://invite/:code` and `tribetracker://challenge/:id`
- Pending invite stored in-memory (`utils/pendingInvite.ts`) when user not authenticated

### Adding New Features

1. **New screen:** Add to `screens/`, register in `navigation/RootNavigator.tsx`, add to `RootStackParamList`
2. **New Redux state:** Create slice in `redux/slices/`, add to store, add sync actions to `syncMiddleware.ts`
3. **New API endpoint:** Add to `tribe-tracker-backend/api/`, follows existing patterns with auth check and snake_case/camelCase transforms

## Environment Variables

Frontend (`.env`):
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_API_URL=https://tribe-tracker-backend.vercel.app
```

Backend (Vercel env vars):
```
SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY
```

## Key Dependencies
- Expo SDK 54, React 19.1, React Native 0.81 (New Architecture enabled)
- `react-native-reanimated` + `react-native-gesture-handler` for animations/gestures
- `react-native-draggable-flatlist` for challenge reordering
- `react-hook-form` for forms
- `expo-image` for cached image rendering
- `expo-notifications` for local push notifications
- `expo-linear-gradient` + `expo-blur` for visual effects
- Bundle ID: `com.lanegarner.tribetracker`, portrait-only, edge-to-edge Android
- No test framework configured

## Key Utility Files
- `lib/supabase.ts` - Supabase client init with AsyncStorage auth persistence
- `config/api.ts` - API_URL, SUPABASE_URL, SUPABASE_ANON_KEY from Expo constants
- `utils/dateUtils.ts` - 20+ date helpers, challenge status calculation, formatting
- `utils/storage.ts` - AsyncStorage key management, load/save pairs, `clearUserData()`
- `utils/notifications.ts` - Push notification scheduling, permission management
- `utils/imageUpload.ts` - Supabase Storage upload/delete for avatars and challenge backgrounds
- `utils/chatUtils.ts` - Read receipts, message grouping (5-min window), date separators
- `utils/streakUtils.ts` - Consecutive day streak calculation
- `utils/pendingInvite.ts` - In-memory invite queue for unauthenticated deep links
- `utils/api.ts` - API/Supabase URL config from Expo constants

## Reference: rhythm Project

This project follows patterns from `../rhythm`. When implementing new features, reference rhythm's implementation for:
- Supabase client setup (`lib/supabase.ts`)
- Auth context pattern (`context/AuthContext.tsx`)
- Sync middleware approach (`redux/syncMiddleware.ts`)
- API route structure (Vercel functions)
