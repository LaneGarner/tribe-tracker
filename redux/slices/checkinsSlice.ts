import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { HabitCheckin } from '../../types';
import { saveCheckins, loadCheckins } from '../../utils/storage';
import { API_URL } from '../../config/api';

interface CheckinsState {
  data: HabitCheckin[];
  loading: boolean;
  error: string | null;
}

const initialState: CheckinsState = {
  data: [],
  loading: false,
  error: null,
};

// Async thunk to load checkins from storage
export const loadCheckinsFromStorage = createAsyncThunk(
  'checkins/loadFromStorage',
  async () => {
    const checkins = await loadCheckins();
    return checkins;
  }
);

// Async thunk to fetch checkins from the backend API
export const fetchCheckinsFromServer = createAsyncThunk(
  'checkins/fetchFromServer',
  async (token: string) => {
    const response = await fetch(`${API_URL}/api/checkins`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch checkins');
    }
    const data = await response.json();
    const checkins: HabitCheckin[] = data.checkins || [];
    await saveCheckins(checkins);
    return checkins;
  }
);

const checkinsSlice = createSlice({
  name: 'checkins',
  initialState,
  reducers: {
    setCheckins: (state, action: PayloadAction<HabitCheckin[]>) => {
      state.data = action.payload;
      state.loading = false;
      state.error = null;
      saveCheckins(action.payload);
    },
    addCheckin: (state, action: PayloadAction<HabitCheckin>) => {
      // Check if checkin already exists for this user/challenge/date
      const existingIndex = state.data.findIndex(
        c =>
          c.challengeId === action.payload.challengeId &&
          c.userId === action.payload.userId &&
          c.checkinDate === action.payload.checkinDate
      );
      if (existingIndex !== -1) {
        // Update existing checkin
        state.data[existingIndex] = {
          ...action.payload,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Add new checkin
        state.data.push(action.payload);
      }
      saveCheckins(state.data);
    },
    updateCheckin: (state, action: PayloadAction<HabitCheckin>) => {
      const index = state.data.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.data[index] = {
          ...action.payload,
          updatedAt: new Date().toISOString(),
        };
        saveCheckins(state.data);
      }
    },
    updateHabitCompletion: (
      state,
      action: PayloadAction<{
        checkinId: string;
        habitIndex: number;
        completed: boolean;
      }>
    ) => {
      const checkin = state.data.find(c => c.id === action.payload.checkinId);
      if (checkin) {
        checkin.habitsCompleted[action.payload.habitIndex] =
          action.payload.completed;
        checkin.allHabitsCompleted = checkin.habitsCompleted.every(h => h);
        checkin.pointsEarned = checkin.habitsCompleted.filter(h => h).length;
        checkin.updatedAt = new Date().toISOString();
        saveCheckins(state.data);
      }
    },
    deleteCheckin: (state, action: PayloadAction<string>) => {
      state.data = state.data.filter(c => c.id !== action.payload);
      saveCheckins(state.data);
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
      .addCase(loadCheckinsFromStorage.pending, state => {
        state.loading = true;
      })
      .addCase(loadCheckinsFromStorage.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
      })
      .addCase(loadCheckinsFromStorage.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to load checkins';
        state.loading = false;
      })
      .addCase(fetchCheckinsFromServer.pending, state => {
        state.loading = true;
      })
      .addCase(fetchCheckinsFromServer.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchCheckinsFromServer.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch checkins';
        state.loading = false;
      });
  },
});

export const {
  setCheckins,
  addCheckin,
  updateCheckin,
  updateHabitCompletion,
  deleteCheckin,
  setLoading,
  setError,
} = checkinsSlice.actions;

export default checkinsSlice.reducer;
