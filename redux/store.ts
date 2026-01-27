import { configureStore } from '@reduxjs/toolkit';
import challengesReducer from './slices/challengesSlice';
import participantsReducer from './slices/participantsSlice';
import checkinsReducer from './slices/checkinsSlice';
import profileReducer from './slices/profileSlice';
import { syncMiddleware } from './syncMiddleware';

export const store = configureStore({
  reducer: {
    challenges: challengesReducer,
    participants: participantsReducer,
    checkins: checkinsReducer,
    profile: profileReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(syncMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
