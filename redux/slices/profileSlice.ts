import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { UserProfile } from '../../types';
import { saveProfile, loadProfile } from '../../utils/storage';
import { API_URL } from '../../config/api';

interface ProfileState {
  data: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  data: null,
  loading: false,
  error: null,
};

// Async thunk to load profile from storage
export const loadProfileFromStorage = createAsyncThunk(
  'profile/loadFromStorage',
  async () => {
    const profile = await loadProfile();
    return profile;
  }
);

// Async thunk to fetch profile from the backend API
export const fetchProfileFromServer = createAsyncThunk(
  'profile/fetchFromServer',
  async (token: string) => {
    const response = await fetch(`${API_URL}/api/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }
    const data = await response.json();
    const profile: UserProfile | null = data.profile || null;
    if (profile) {
      await saveProfile(profile);
    }
    return profile;
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<UserProfile | null>) => {
      state.data = action.payload;
      state.loading = false;
      state.error = null;
      if (action.payload) {
        saveProfile(action.payload);
      }
    },
    updateProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.data) {
        state.data = {
          ...state.data,
          ...action.payload,
          updatedAt: new Date().toISOString(),
        };
        saveProfile(state.data);
      }
    },
    updatePrivacySettings: (
      state,
      action: PayloadAction<{
        hideEmail?: boolean;
        hideAge?: boolean;
        hideHeight?: boolean;
        hideWeight?: boolean;
        hideLocation?: boolean;
        hideBio?: boolean;
      }>
    ) => {
      if (state.data) {
        state.data = {
          ...state.data,
          ...action.payload,
          updatedAt: new Date().toISOString(),
        };
        saveProfile(state.data);
      }
    },
    updateChallengeOrder: (state, action: PayloadAction<string[]>) => {
      if (state.data) {
        state.data.challengeOrder = action.payload;
        state.data.updatedAt = new Date().toISOString();
        saveProfile(state.data);
      }
    },
    clearProfile: state => {
      state.data = null;
      state.loading = false;
      state.error = null;
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
      .addCase(loadProfileFromStorage.pending, state => {
        state.loading = true;
      })
      .addCase(loadProfileFromStorage.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
      })
      .addCase(loadProfileFromStorage.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to load profile';
        state.loading = false;
      })
      .addCase(fetchProfileFromServer.pending, state => {
        state.loading = true;
      })
      .addCase(fetchProfileFromServer.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchProfileFromServer.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch profile';
        state.loading = false;
      });
  },
});

export const {
  setProfile,
  updateProfile,
  updatePrivacySettings,
  updateChallengeOrder,
  clearProfile,
  setLoading,
  setError,
} = profileSlice.actions;

export default profileSlice.reducer;
