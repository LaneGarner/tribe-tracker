import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { BadgeDefinition, UserBadge } from '../../types';
import {
  saveBadgeDefinitions,
  loadBadgeDefinitions,
  saveBadges,
  loadBadges,
} from '../../utils/storage';
import { API_URL } from '../../config/api';

// Level titles based on points
export const LEVEL_TITLES: Record<number, string> = {
  1: 'Newcomer',
  2: 'Regular',
  3: 'Committed',
  4: 'Dedicated',
  5: 'Consistent',
  6: 'Veteran',
  7: 'Elite',
};

export function calculateLevel(points: number): number {
  return Math.floor(points / 10) + 1;
}

export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level, 7)] || LEVEL_TITLES[7];
}

export function getPointsForNextLevel(currentPoints: number): number {
  const currentLevel = calculateLevel(currentPoints);
  return currentLevel * 10 - currentPoints;
}

interface BadgesState {
  definitions: BadgeDefinition[];
  earned: UserBadge[];
  totalPoints: number;
  level: number;
  loading: boolean;
  error: string | null;
}

const initialState: BadgesState = {
  definitions: [],
  earned: [],
  totalPoints: 0,
  level: 1,
  loading: false,
  error: null,
};

// Async thunk to load badges from storage
export const loadBadgesFromStorage = createAsyncThunk(
  'badges/loadFromStorage',
  async () => {
    const [definitions, earned] = await Promise.all([
      loadBadgeDefinitions(),
      loadBadges(),
    ]);
    // Calculate total points from earned badges
    const totalPoints = earned.reduce((sum, userBadge) => {
      const definition = definitions.find(d => d.id === userBadge.badgeId);
      return sum + (definition?.points || 0);
    }, 0);
    const level = calculateLevel(totalPoints);
    return { definitions, earned, totalPoints, level };
  }
);

// Async thunk to fetch badges from the backend API
export const fetchBadgesFromServer = createAsyncThunk(
  'badges/fetchFromServer',
  async (token: string) => {
    const response = await fetch(`${API_URL}/api/badges`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch badges');
    }
    const data = await response.json();
    const definitions: BadgeDefinition[] = data.definitions || [];
    const earned: UserBadge[] = data.badges || [];
    const totalPoints: number = data.totalPoints || 0;
    const level: number = data.level || calculateLevel(totalPoints);

    // Save to storage
    await Promise.all([
      saveBadgeDefinitions(definitions),
      saveBadges(earned),
    ]);

    return { definitions, earned, totalPoints, level };
  }
);

const badgesSlice = createSlice({
  name: 'badges',
  initialState,
  reducers: {
    setBadges: (
      state,
      action: PayloadAction<{
        definitions: BadgeDefinition[];
        earned: UserBadge[];
        totalPoints: number;
        level: number;
      }>
    ) => {
      state.definitions = action.payload.definitions;
      state.earned = action.payload.earned;
      state.totalPoints = action.payload.totalPoints;
      state.level = action.payload.level;
      state.loading = false;
      state.error = null;
      saveBadgeDefinitions(action.payload.definitions);
      saveBadges(action.payload.earned);
    },
    addEarnedBadge: (state, action: PayloadAction<UserBadge>) => {
      // Check if already earned (by badgeId and challengeId combo)
      const exists = state.earned.some(
        b =>
          b.badgeId === action.payload.badgeId &&
          b.challengeId === action.payload.challengeId
      );
      if (!exists) {
        state.earned.push(action.payload);
        // Recalculate points
        const definition = state.definitions.find(
          d => d.id === action.payload.badgeId
        );
        if (definition) {
          state.totalPoints += definition.points;
          state.level = calculateLevel(state.totalPoints);
        }
        saveBadges(state.earned);
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearBadges: state => {
      state.definitions = [];
      state.earned = [];
      state.totalPoints = 0;
      state.level = 1;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadBadgesFromStorage.pending, state => {
        state.loading = true;
      })
      .addCase(loadBadgesFromStorage.fulfilled, (state, action) => {
        state.definitions = action.payload.definitions;
        state.earned = action.payload.earned;
        state.totalPoints = action.payload.totalPoints;
        state.level = action.payload.level;
        state.loading = false;
      })
      .addCase(loadBadgesFromStorage.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to load badges';
        state.loading = false;
      })
      .addCase(fetchBadgesFromServer.pending, state => {
        state.loading = true;
      })
      .addCase(fetchBadgesFromServer.fulfilled, (state, action) => {
        state.definitions = action.payload.definitions;
        state.earned = action.payload.earned;
        state.totalPoints = action.payload.totalPoints;
        state.level = action.payload.level;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchBadgesFromServer.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch badges';
        state.loading = false;
      });
  },
});

export const {
  setBadges,
  addEarnedBadge,
  setLoading,
  setError,
  clearBadges,
} = badgesSlice.actions;

export default badgesSlice.reducer;
