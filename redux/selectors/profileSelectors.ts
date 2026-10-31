import type { RootState } from '../store';

// Refreshing an already resolved profile must not tear down the navigator.
export const selectProfileBootstrapResolved = (state: Pick<RootState, 'profile'>): boolean =>
  state.profile.hasFetchedFromServer || (state.profile.data !== null && !state.profile.loading);
