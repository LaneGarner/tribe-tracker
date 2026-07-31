# Tribe Tracker — Social Habit Challenges with an AI Coach

A React Native (Expo) app where you create habit challenges, invite your people, and compete on points, streaks, and leaderboards — with an AI coach that reads your actual check-in data and tells you what to fix this week.

## Why it's interesting

Habit apps are easy; habit apps that work offline, sync a group leaderboard, run real-time chat, and coach you honestly are not. Tribe Tracker is offline-first end to end (optimistic Redux updates, AsyncStorage persistence, a background sync queue with retry), and its AI coach is grounded rather than generative fluff: the backend assembles each user's last 14 days of per-habit check-ins, streaks, and leaderboard math into a structured prompt, and GPT-4o-mini returns a validated JSON synopsis — what stands out, which specific habit is slipping, whether the leaderboard gap is mathematically closable in the days remaining, and one concrete ask for the week. If the model is unavailable, a deterministic stats-based fallback produces the same shape from the raw numbers, so coaching never silently fails.

## Features

- **Challenges & habits** — create multi-habit challenges with durations, categories, and public discovery; drag-to-reorder your challenge list
- **Compete together** — invite via deep link (`tribetracker://invite/:code`) or web share page; leaderboards, points, current/longest streaks, badges and level progression
- **Daily check-ins** — per-habit completion tracking with points, upserted per day
- **AI coach** — per-challenge coaching generated from your real metrics (OpenAI GPT-4o-mini): opener, data-tied observations, an honest leaderboard gap read, and a concrete weekly ask; rate-limited, with a deterministic fallback
- **Weekly tribe digest** — a Vercel Cron job posts an AI-written Monday recap (wins, one honest concern, this week's focus) into each active challenge's group chat as a system message
- **AI challenge matching** — onboarding wizard ranks public challenges against your stated goals
- **Chat** — real-time group chats auto-created per challenge (Supabase `postgres_changes` + polling fallback), DMs with request/accept flow, typing indicators, read receipts, user blocking
- **Notifications** — local push for daily reminders, streak warnings, challenge activity, and challenge start/end
- **Offline-first** — full functionality without a connection; changes queue and sync when back online
- **Theming** — light/dark/system modes, glass-morphism tab bar with animated indicator, haptics

## Tech Stack

**App (this repo)**

- React Native 0.81 + Expo SDK 54 (New Architecture), React 19, TypeScript
- Redux Toolkit with AsyncStorage persistence and a custom sync middleware
- React Navigation v7 (native-stack + bottom tabs)
- NativeWind (Tailwind) + dynamic theming via `ThemeContext`
- Supabase JS client for auth, realtime chat, and storage (avatars, challenge backgrounds)
- `expo-notifications`, `expo-image`, `react-native-reanimated`, `react-native-gesture-handler`
- Jest (`jest-expo`) for tests
- EAS builds, deep linking, portrait-only, bundle ID `com.lanegarner.tribetracker`

**Backend ([tribe-tracker-backend](../tribe-tracker-backend))**

- Vercel serverless functions (TypeScript) + Supabase (Postgres, Auth JWTs, RLS, Realtime)
- OpenAI API (GPT-4o-mini) for the coach, weekly digest, and challenge matching
- Vercel Cron for the Monday digest; Supabase Edge Functions (Deno) for email
- Timestamp-based sync (`?since=`) on all GET endpoints

## Architecture

### Offline-first data flow

```
User action → Redux dispatch → local state update → AsyncStorage save → background API sync
```

1. Redux actions apply optimistically and persist to AsyncStorage immediately
2. `syncMiddleware.ts` pushes synced actions to the backend in the background
3. Failed syncs queue to `tribe_pending_sync` and retry (exponential backoff on FK races)
4. App boot hydrates each slice from AsyncStorage, then reconciles with the server

### AI coach pipeline (`backend /api/coach`)

```
JWT auth → rate limit (10/day/user)
  → load active challenges + participant stats + last 14 days of check-ins + leaderboard
  → structured prompt → GPT-4o-mini (JSON response format)
  → schema validation (IDs must match input; malformed items dropped)
  → deterministic per-habit-completion-rate fallback fills any gaps
```

### State (Redux Toolkit slices)

`challenges` · `participants` · `checkins` · `profile` · `badges` · `chat`

## Screenshots

<!-- TODO: capture and add screenshots
  - Home screen with active challenges
  - Challenge detail with habits + participants
  - Daily check-in flow
  - Leaderboard
  - AI coach screen showing a generated synopsis
  - Group chat with a weekly digest message
  - Onboarding wizard / challenge matching
  - Badges / level progression
  - Dark and light mode side by side
-->

_Screenshots coming soon._

## Getting Started

```bash
npm install
npm start            # Expo dev server
npm run ios          # iOS simulator
npm run android      # Android emulator
npm test
```

### Environment variables (`.env`)

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=          # tribe-tracker-backend deployment
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=
# Optional for an explicitly mocked local billing flow; omit from release builds.
EXPO_PUBLIC_BILLING_MODE=mock
```

RevenueCat should expose a current offering with monthly and annual packages
that unlock the `pro` entitlement. Store products, pricing, and webhook
configuration are intentionally managed outside the app repository.

The backend production checklist is documented in
`tribe-tracker-backend/docs/REVENUECAT_PRODUCTION_SETUP.md`.

## Project Structure

```
/tribe-tracker
├── App.tsx
├── screens/          # Home, Challenges, Leaderboard, Chat, Coaching, Onboarding, ...
├── components/       # ChallengeCard, tab bar, chat UI, ...
├── redux/            # store, slices, syncMiddleware
├── navigation/       # RootNavigator, tabs, deep linking
├── hooks/            # realtime chat, notifications, avatar picker, typing
├── context/          # Theme, Auth
├── utils/            # dates, streaks, storage, notifications, image upload
├── supabase/         # database migrations and server-side support
└── types/
```

> Tribe Tracker is in active development.
