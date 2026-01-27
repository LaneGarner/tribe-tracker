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

# Building
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

### State Management (Redux Toolkit)

**Store structure:**
- `challenges` - Challenge data (CRUD)
- `participants` - User participation in challenges
- `checkins` - Daily habit check-ins
- `profile` - User profile

**Key pattern:** Each slice loads from AsyncStorage on app start via async thunks, then middleware handles backend sync.

### AsyncStorage Keys
- `tribe_challenges`, `tribe_participants`, `tribe_checkins`, `tribe_profile` - Data
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

### Backend (`/tribe-tracker-backend`)

Vercel serverless functions with Supabase:
- `/api/challenges` - Challenge CRUD
- `/api/participants` - Participant management
- `/api/checkins` - Check-in tracking
- `/api/users` - User profiles
- `/api/invite` - Challenge invite codes

Auth: Supabase JWT tokens passed via `Authorization: Bearer <token>`

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

### Navigation
- React Navigation v7 with native-stack
- Type params in `types/index.ts` (`RootStackParamList`, `TabParamList`)
- 4 bottom tabs: Home, Challenges, Leaderboard, Menu

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

## Reference: rhythm Project

This project follows patterns from `../rhythm`. When implementing new features, reference rhythm's implementation for:
- Supabase client setup (`lib/supabase.ts`)
- Auth context pattern (`context/AuthContext.tsx`)
- Sync middleware approach (`redux/syncMiddleware.ts`)
- API route structure (Vercel functions)
