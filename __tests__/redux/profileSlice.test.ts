import { UserProfile } from '../../types';

jest.mock('../../utils/storage', () => ({
  saveChallenges: jest.fn(),
  loadChallenges: jest.fn(() => Promise.resolve([])),
  saveParticipants: jest.fn(),
  loadParticipants: jest.fn(() => Promise.resolve([])),
  saveCheckins: jest.fn(),
  loadCheckins: jest.fn(() => Promise.resolve([])),
  saveProfile: jest.fn(),
  loadProfile: jest.fn(() => Promise.resolve(null)),
  saveBadgeDefinitions: jest.fn(),
  loadBadgeDefinitions: jest.fn(() => Promise.resolve([])),
  saveBadges: jest.fn(),
  loadBadges: jest.fn(() => Promise.resolve([])),
  saveConversations: jest.fn(),
  loadConversations: jest.fn(() => Promise.resolve([])),
  saveMessages: jest.fn(),
  loadMessages: jest.fn(() => Promise.resolve({})),
  saveBlockedUsers: jest.fn(),
  loadBlockedUsers: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../../config/api', () => ({
  API_URL: 'https://test-api.vercel.app',
}));

import reducer, {
  setProfile,
  updateProfile,
  updatePrivacySettings,
  updateChallengeOrder,
  clearProfile,
  setLoading,
  setError,
} from '../../redux/slices/profileSlice';
import { saveProfile } from '../../utils/storage';

const makeProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'u1',
  email: 'test@test.com',
  hideEmail: false,
  hideAge: false,
  hideHeight: false,
  hideWeight: false,
  hideLocation: false,
  hideBio: false,
  profileVisible: true,
  pushNotifications: true,
  emailNotifications: true,
  isChildAccount: false,
  parentVerified: false,
  challengeOrder: [],
  ...overrides,
});

describe('profileSlice', () => {
  const initialState = { data: null, loading: false, error: null };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return the initial state', () => {
      const state = reducer(undefined, { type: 'unknown' });
      expect(state).toEqual(initialState);
    });
  });

  describe('setProfile', () => {
    it('should set data, loading=false, error=null with a profile', () => {
      const profile = makeProfile();
      const prev = { data: null, loading: true, error: 'some error' };
      const state = reducer(prev, setProfile(profile));

      expect(state.data).toEqual(profile);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set data to null when null is passed', () => {
      const prev = { data: makeProfile(), loading: false, error: null };
      const state = reducer(prev, setProfile(null));

      expect(state.data).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should call saveProfile when profile is not null', () => {
      const profile = makeProfile();
      reducer(initialState, setProfile(profile));
      expect(saveProfile).toHaveBeenCalledWith(profile);
    });

    it('should not call saveProfile when profile is null', () => {
      reducer(initialState, setProfile(null));
      expect(saveProfile).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should shallow merge partial update and set updatedAt', () => {
      const profile = makeProfile({ fullName: 'Old Name' });
      const prev = { data: profile, loading: false, error: null };
      const state = reducer(prev, updateProfile({ fullName: 'New Name' }));

      expect(state.data!.fullName).toBe('New Name');
      expect(state.data!.email).toBe('test@test.com'); // unchanged
      expect(state.data!.updatedAt).toBeDefined();
    });

    it('should be a no-op if data is null', () => {
      const state = reducer(initialState, updateProfile({ fullName: 'Name' }));
      expect(state.data).toBeNull();
    });

    it('should not call saveProfile if data is null', () => {
      reducer(initialState, updateProfile({ fullName: 'Name' }));
      expect(saveProfile).not.toHaveBeenCalled();
    });

    it('should call saveProfile when data exists', () => {
      const prev = { data: makeProfile(), loading: false, error: null };
      reducer(prev, updateProfile({ fullName: 'Updated' }));
      expect(saveProfile).toHaveBeenCalled();
    });

    it('should update multiple fields at once', () => {
      const profile = makeProfile();
      const prev = { data: profile, loading: false, error: null };
      const state = reducer(
        prev,
        updateProfile({ fullName: 'Jane Doe', bio: 'Hello', city: 'NYC' })
      );

      expect(state.data!.fullName).toBe('Jane Doe');
      expect(state.data!.bio).toBe('Hello');
      expect(state.data!.city).toBe('NYC');
    });
  });

  describe('updatePrivacySettings', () => {
    it('should merge privacy flags and set updatedAt', () => {
      const profile = makeProfile({ hideEmail: false, hideAge: false });
      const prev = { data: profile, loading: false, error: null };
      const state = reducer(prev, updatePrivacySettings({ hideEmail: true }));

      expect(state.data!.hideEmail).toBe(true);
      expect(state.data!.hideAge).toBe(false); // unchanged
      expect(state.data!.updatedAt).toBeDefined();
    });

    it('should update multiple privacy fields at once', () => {
      const profile = makeProfile();
      const prev = { data: profile, loading: false, error: null };
      const state = reducer(
        prev,
        updatePrivacySettings({ hideEmail: true, hideAge: true, hideBio: true })
      );

      expect(state.data!.hideEmail).toBe(true);
      expect(state.data!.hideAge).toBe(true);
      expect(state.data!.hideBio).toBe(true);
      expect(state.data!.hideHeight).toBe(false); // unchanged
    });

    it('should be a no-op if data is null', () => {
      const state = reducer(initialState, updatePrivacySettings({ hideEmail: true }));
      expect(state.data).toBeNull();
    });

    it('should not call saveProfile if data is null', () => {
      reducer(initialState, updatePrivacySettings({ hideEmail: true }));
      expect(saveProfile).not.toHaveBeenCalled();
    });

    it('should call saveProfile when data exists', () => {
      const prev = { data: makeProfile(), loading: false, error: null };
      reducer(prev, updatePrivacySettings({ hideEmail: true }));
      expect(saveProfile).toHaveBeenCalled();
    });
  });

  describe('updateChallengeOrder', () => {
    it('should set challengeOrder array and updatedAt', () => {
      const profile = makeProfile({ challengeOrder: [] });
      const prev = { data: profile, loading: false, error: null };
      const order = ['c3', 'c1', 'c2'];
      const state = reducer(prev, updateChallengeOrder(order));

      expect(state.data!.challengeOrder).toEqual(order);
      expect(state.data!.updatedAt).toBeDefined();
    });

    it('should handle empty order array', () => {
      const profile = makeProfile({ challengeOrder: ['c1', 'c2'] });
      const prev = { data: profile, loading: false, error: null };
      const state = reducer(prev, updateChallengeOrder([]));

      expect(state.data!.challengeOrder).toEqual([]);
    });

    it('should be a no-op if data is null', () => {
      const state = reducer(initialState, updateChallengeOrder(['c1']));
      expect(state.data).toBeNull();
    });

    it('should call saveProfile when data exists', () => {
      const prev = { data: makeProfile(), loading: false, error: null };
      reducer(prev, updateChallengeOrder(['c1']));
      expect(saveProfile).toHaveBeenCalled();
    });
  });

  describe('clearProfile', () => {
    it('should reset data to null, loading=false, error=null', () => {
      const prev = { data: makeProfile(), loading: true, error: 'some error' };
      const state = reducer(prev, clearProfile());

      expect(state.data).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should be safe to call when already null', () => {
      const state = reducer(initialState, clearProfile());
      expect(state.data).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading to true', () => {
      const state = reducer(initialState, setLoading(true));
      expect(state.loading).toBe(true);
    });

    it('should set loading to false', () => {
      const state = reducer({ ...initialState, loading: true }, setLoading(false));
      expect(state.loading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error and loading to false', () => {
      const state = reducer({ ...initialState, loading: true }, setError('Error!'));
      expect(state.error).toBe('Error!');
      expect(state.loading).toBe(false);
    });

    it('should clear error with null', () => {
      const prev = { data: null, loading: false, error: 'old' };
      const state = reducer(prev, setError(null));
      expect(state.error).toBeNull();
    });
  });
});
