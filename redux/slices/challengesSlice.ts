import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Challenge } from '../../types';
import { saveChallenges, loadChallenges } from '../../utils/storage';
import { API_URL } from '../../config/api';

interface ChallengesState {
  data: Challenge[];
  loading: boolean;
  error: string | null;
}

const initialState: ChallengesState = {
  data: [],
  loading: true,
  error: null,
};

// Async thunk to load challenges from storage
export const loadChallengesFromStorage = createAsyncThunk(
  'challenges/loadFromStorage',
  async () => {
    const challenges = await loadChallenges();
    return challenges;
  }
);

// Async thunk to fetch challenges from the backend API
export const fetchChallengesFromServer = createAsyncThunk(
  'challenges/fetchFromServer',
  async (token: string) => {
    const response = await fetch(`${API_URL}/api/challenges`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch challenges');
    }
    const data = await response.json();
    const challenges: Challenge[] = data.challenges || [];
    await saveChallenges(challenges);
    return challenges;
  }
);

// Async thunk to fetch public challenges from the backend API
export const fetchPublicChallenges = createAsyncThunk(
  'challenges/fetchPublicChallenges',
  async (token: string, { getState }) => {
    const response = await fetch(`${API_URL}/api/challenges?isPublic=true`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch public challenges');
    }
    const data = await response.json();
    return data.challenges || [];
  }
);

const challengesSlice = createSlice({
  name: 'challenges',
  initialState,
  reducers: {
    setChallenges: (state, action: PayloadAction<Challenge[]>) => {
      state.data = action.payload;
      state.loading = false;
      state.error = null;
      saveChallenges(action.payload);
    },
    addChallenge: (state, action: PayloadAction<Challenge>) => {
      state.data.push(action.payload);
      saveChallenges(state.data);
    },
    updateChallenge: (state, action: PayloadAction<Challenge>) => {
      const index = state.data.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.data[index] = {
          ...action.payload,
          updatedAt: new Date().toISOString(),
        };
        saveChallenges(state.data);
      }
    },
    deleteChallenge: (state, action: PayloadAction<string>) => {
      state.data = state.data.filter(c => c.id !== action.payload);
      saveChallenges(state.data);
    },
    reorderChallenges: (state, action: PayloadAction<string[]>) => {
      const orderMap = new Map(action.payload.map((id, index) => [id, index]));
      state.data.sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? Infinity;
        const orderB = orderMap.get(b.id) ?? Infinity;
        return orderA - orderB;
      });
      saveChallenges(state.data);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadChallengesFromStorage.pending, state => {
        state.loading = true;
      })
      .addCase(loadChallengesFromStorage.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
      })
      .addCase(loadChallengesFromStorage.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to load challenges';
        state.loading = false;
      })
      .addCase(fetchChallengesFromServer.pending, state => {
        state.loading = true;
      })
      .addCase(fetchChallengesFromServer.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchChallengesFromServer.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch challenges';
        state.loading = false;
      })
      .addCase(fetchPublicChallenges.pending, state => {
        state.loading = true;
      })
      .addCase(fetchPublicChallenges.fulfilled, (state, action) => {
        // Merge public challenges with existing ones (avoid duplicates)
        const existingIds = new Set(state.data.map(c => c.id));
        const newChallenges = action.payload.filter(
          (c: Challenge) => !existingIds.has(c.id)
        );
        state.data = [...state.data, ...newChallenges];
        saveChallenges(state.data);
        state.loading = false;
      })
      .addCase(fetchPublicChallenges.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch public challenges';
        state.loading = false;
      });
  },
});

export const {
  setChallenges,
  addChallenge,
  updateChallenge,
  deleteChallenge,
  reorderChallenges,
  setLoading,
  setError,
} = challengesSlice.actions;

export default challengesSlice.reducer;
