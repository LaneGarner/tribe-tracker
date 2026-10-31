import { selectProfileBootstrapResolved } from '../../redux/selectors/profileSelectors';
import type { RootState } from '../../redux/store';

const state = (overrides = {}) => ({ profile: {
  data: null, loading: false, error: null, hasFetchedFromServer: false, ...overrides,
} }) as Pick<RootState, 'profile'>;

it('waits during initial profile bootstrap', () => {
  expect(selectProfileBootstrapResolved(state({ loading: true }))).toBe(false);
});
it('keeps navigation mounted through refresh and refresh failure after bootstrap', () => {
  expect(selectProfileBootstrapResolved(state({ hasFetchedFromServer: true, loading: true }))).toBe(true);
  expect(selectProfileBootstrapResolved(state({ hasFetchedFromServer: true, error: 'Offline' }))).toBe(true);
});
it('resolves a missing profile after fetch so onboarding can handle it', () => {
  expect(selectProfileBootstrapResolved(state({ hasFetchedFromServer: true }))).toBe(true);
});
it('returns to bootstrap when account state is cleared', () => {
  expect(selectProfileBootstrapResolved(state())).toBe(false);
});
