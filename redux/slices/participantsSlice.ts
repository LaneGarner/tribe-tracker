import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { ChallengeParticipant } from '../../types';
import { saveParticipants, loadParticipants } from '../../utils/storage';
import { API_URL } from '../../config/api';

interface ParticipantsState {
  data: ChallengeParticipant[];
  loading: boolean;
  error: string | null;
}

const initialState: ParticipantsState = {
  data: [],
  loading: false,
  error: null,
};

// Async thunk to load participants from storage
export const loadParticipantsFromStorage = createAsyncThunk(
  'participants/loadFromStorage',
  async () => {
    const participants = await loadParticipants();
    return participants;
  }
);

// Async thunk to fetch participants from the backend API
export const fetchParticipantsFromServer = createAsyncThunk(
  'participants/fetchFromServer',
  async (token: string) => {
    const response = await fetch(`${API_URL}/api/participants`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch participants');
    }
    const data = await response.json();
    const participants: ChallengeParticipant[] = data.participants || [];
    await saveParticipants(participants);
    return participants;
  }
);

const participantsSlice = createSlice({
  name: 'participants',
  initialState,
  reducers: {
    setParticipants: (state, action: PayloadAction<ChallengeParticipant[]>) => {
      state.data = action.payload;
      state.loading = false;
      state.error = null;
      saveParticipants(action.payload);
    },
    addParticipant: (state, action: PayloadAction<ChallengeParticipant>) => {
      state.data.push(action.payload);
      saveParticipants(state.data);
    },
    updateParticipant: (state, action: PayloadAction<ChallengeParticipant>) => {
      const index = state.data.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.data[index] = {
          ...action.payload,
          updatedAt: new Date().toISOString(),
        };
        saveParticipants(state.data);
      }
    },
    removeParticipant: (state, action: PayloadAction<string>) => {
      state.data = state.data.filter(p => p.id !== action.payload);
      saveParticipants(state.data);
    },
    updateParticipantStats: (
      state,
      action: PayloadAction<{
        id: string;
        totalPoints: number;
        currentStreak: number;
        longestStreak: number;
        daysParticipated: number;
        lastCheckinDate: string;
      }>
    ) => {
      const participant = state.data.find(p => p.id === action.payload.id);
      if (participant) {
        participant.totalPoints = action.payload.totalPoints;
        participant.currentStreak = action.payload.currentStreak;
        participant.longestStreak = action.payload.longestStreak;
        participant.daysParticipated = action.payload.daysParticipated;
        participant.lastCheckinDate = action.payload.lastCheckinDate;
        participant.updatedAt = new Date().toISOString();
        saveParticipants(state.data);
      }
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
      .addCase(loadParticipantsFromStorage.pending, state => {
        state.loading = true;
      })
      .addCase(loadParticipantsFromStorage.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
      })
      .addCase(loadParticipantsFromStorage.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to load participants';
        state.loading = false;
      })
      .addCase(fetchParticipantsFromServer.pending, state => {
        state.loading = true;
      })
      .addCase(fetchParticipantsFromServer.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchParticipantsFromServer.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch participants';
        state.loading = false;
      });
  },
});

export const {
  setParticipants,
  addParticipant,
  updateParticipant,
  removeParticipant,
  updateParticipantStats,
  setLoading,
  setError,
} = participantsSlice.actions;

export default participantsSlice.reducer;
