import { Challenge } from '../../types';

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
  setChallenges,
  addChallenge,
  importChallenge,
  updateChallenge,
  deleteChallenge,
  reorderChallenges,
  setLoading,
  setError,
} from '../../redux/slices/challengesSlice';
import { saveChallenges } from '../../utils/storage';

const makeChallenge = (overrides: Partial<Challenge> = {}): Challenge => ({
  id: 'c1',
  name: 'Test',
  creatorId: 'u1',
  durationDays: 30,
  startDate: '2024-01-01',
  habits: ['Exercise'],
  isPublic: false,
  status: 'active',
  participantCount: 1,
  ...overrides,
});

describe('challengesSlice', () => {
  const initialState = { data: [], loading: true, error: null };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return the initial state', () => {
      const state = reducer(undefined, { type: 'unknown' });
      expect(state).toEqual(initialState);
    });
  });

  describe('setChallenges', () => {
    it('should replace data, set loading=false, error=null', () => {
      const challenges = [makeChallenge(), makeChallenge({ id: 'c2', name: 'Second' })];
      const prev = { data: [], loading: true, error: 'old error' };
      const state = reducer(prev, setChallenges(challenges));

      expect(state.data).toEqual(challenges);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should call saveChallenges with the new data', () => {
      const challenges = [makeChallenge()];
      reducer(initialState, setChallenges(challenges));
      expect(saveChallenges).toHaveBeenCalledWith(challenges);
    });

    it('should handle empty array', () => {
      const prev = { data: [makeChallenge()], loading: false, error: null };
      const state = reducer(prev, setChallenges([]));

      expect(state.data).toEqual([]);
      expect(state.loading).toBe(false);
    });
  });

  describe('addChallenge', () => {
    it('should append a new challenge', () => {
      const existing = makeChallenge({ id: 'c1' });
      const newChallenge = makeChallenge({ id: 'c2', name: 'New' });
      const prev = { data: [existing], loading: false, error: null };
      const state = reducer(prev, addChallenge(newChallenge));

      expect(state.data).toHaveLength(2);
      expect(state.data[1]).toEqual(newChallenge);
    });

    it('should skip if duplicate ID exists', () => {
      const existing = makeChallenge({ id: 'c1', name: 'Original' });
      const duplicate = makeChallenge({ id: 'c1', name: 'Duplicate' });
      const prev = { data: [existing], loading: false, error: null };
      const state = reducer(prev, addChallenge(duplicate));

      expect(state.data).toHaveLength(1);
      expect(state.data[0].name).toBe('Original');
    });

    it('should call saveChallenges', () => {
      reducer(initialState, addChallenge(makeChallenge()));
      expect(saveChallenges).toHaveBeenCalled();
    });
  });

  describe('importChallenge', () => {
    it('should append a new challenge', () => {
      const challenge = makeChallenge({ id: 'c3' });
      const state = reducer(initialState, importChallenge(challenge));

      expect(state.data).toHaveLength(1);
      expect(state.data[0]).toEqual(challenge);
    });

    it('should skip if duplicate ID exists', () => {
      const existing = makeChallenge({ id: 'c1', name: 'Existing' });
      const duplicate = makeChallenge({ id: 'c1', name: 'Imported' });
      const prev = { data: [existing], loading: false, error: null };
      const state = reducer(prev, importChallenge(duplicate));

      expect(state.data).toHaveLength(1);
      expect(state.data[0].name).toBe('Existing');
    });

    it('should call saveChallenges', () => {
      reducer(initialState, importChallenge(makeChallenge()));
      expect(saveChallenges).toHaveBeenCalled();
    });
  });

  describe('updateChallenge', () => {
    it('should update matching challenge and set updatedAt', () => {
      const original = makeChallenge({ id: 'c1', name: 'Original' });
      const updated = makeChallenge({ id: 'c1', name: 'Updated' });
      const prev = { data: [original], loading: false, error: null };
      const state = reducer(prev, updateChallenge(updated));

      expect(state.data[0].name).toBe('Updated');
      expect(state.data[0].updatedAt).toBeDefined();
      expect(typeof state.data[0].updatedAt).toBe('string');
    });

    it('should not modify other challenges', () => {
      const c1 = makeChallenge({ id: 'c1', name: 'First' });
      const c2 = makeChallenge({ id: 'c2', name: 'Second' });
      const updated = makeChallenge({ id: 'c1', name: 'Updated First' });
      const prev = { data: [c1, c2], loading: false, error: null };
      const state = reducer(prev, updateChallenge(updated));

      expect(state.data[0].name).toBe('Updated First');
      expect(state.data[1].name).toBe('Second');
    });

    it('should be a no-op if challenge not found', () => {
      const original = makeChallenge({ id: 'c1' });
      const notFound = makeChallenge({ id: 'c999', name: 'Ghost' });
      const prev = { data: [original], loading: false, error: null };
      const state = reducer(prev, updateChallenge(notFound));

      expect(state.data).toHaveLength(1);
      expect(state.data[0].id).toBe('c1');
    });

    it('should call saveChallenges when challenge found', () => {
      const original = makeChallenge({ id: 'c1' });
      const prev = { data: [original], loading: false, error: null };
      reducer(prev, updateChallenge(makeChallenge({ id: 'c1', name: 'Updated' })));
      expect(saveChallenges).toHaveBeenCalled();
    });

    it('should not call saveChallenges when challenge not found', () => {
      const prev = { data: [makeChallenge({ id: 'c1' })], loading: false, error: null };
      reducer(prev, updateChallenge(makeChallenge({ id: 'c999' })));
      expect(saveChallenges).not.toHaveBeenCalled();
    });
  });

  describe('deleteChallenge', () => {
    it('should remove challenge by ID', () => {
      const c1 = makeChallenge({ id: 'c1' });
      const c2 = makeChallenge({ id: 'c2' });
      const prev = { data: [c1, c2], loading: false, error: null };
      const state = reducer(prev, deleteChallenge('c1'));

      expect(state.data).toHaveLength(1);
      expect(state.data[0].id).toBe('c2');
    });

    it('should be a no-op if ID not found', () => {
      const c1 = makeChallenge({ id: 'c1' });
      const prev = { data: [c1], loading: false, error: null };
      const state = reducer(prev, deleteChallenge('c999'));

      expect(state.data).toHaveLength(1);
    });

    it('should call saveChallenges', () => {
      const prev = { data: [makeChallenge()], loading: false, error: null };
      reducer(prev, deleteChallenge('c1'));
      expect(saveChallenges).toHaveBeenCalled();
    });

    it('should handle deleting from empty array', () => {
      const state = reducer(initialState, deleteChallenge('c1'));
      expect(state.data).toEqual([]);
    });
  });

  describe('reorderChallenges', () => {
    it('should sort by provided ID order', () => {
      const c1 = makeChallenge({ id: 'c1', name: 'First' });
      const c2 = makeChallenge({ id: 'c2', name: 'Second' });
      const c3 = makeChallenge({ id: 'c3', name: 'Third' });
      const prev = { data: [c1, c2, c3], loading: false, error: null };
      const state = reducer(prev, reorderChallenges(['c3', 'c1', 'c2']));

      expect(state.data.map(c => c.id)).toEqual(['c3', 'c1', 'c2']);
    });

    it('should send unmapped challenges to end', () => {
      const c1 = makeChallenge({ id: 'c1' });
      const c2 = makeChallenge({ id: 'c2' });
      const c3 = makeChallenge({ id: 'c3' });
      const prev = { data: [c1, c2, c3], loading: false, error: null };
      // Only map c3 and c1, c2 is unmapped
      const state = reducer(prev, reorderChallenges(['c3', 'c1']));

      expect(state.data[0].id).toBe('c3');
      expect(state.data[1].id).toBe('c1');
      expect(state.data[2].id).toBe('c2'); // unmapped goes to end
    });

    it('should handle empty order array (all unmapped)', () => {
      const c1 = makeChallenge({ id: 'c1' });
      const c2 = makeChallenge({ id: 'c2' });
      const prev = { data: [c1, c2], loading: false, error: null };
      const state = reducer(prev, reorderChallenges([]));

      // All get Infinity, so original relative order is maintained
      expect(state.data).toHaveLength(2);
    });

    it('should call saveChallenges', () => {
      const prev = { data: [makeChallenge()], loading: false, error: null };
      reducer(prev, reorderChallenges(['c1']));
      expect(saveChallenges).toHaveBeenCalled();
    });
  });

  describe('setLoading', () => {
    it('should set loading to true', () => {
      const state = reducer({ ...initialState, loading: false }, setLoading(true));
      expect(state.loading).toBe(true);
    });

    it('should set loading to false', () => {
      const state = reducer(initialState, setLoading(false));
      expect(state.loading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error and loading to false', () => {
      const state = reducer(initialState, setError('Something went wrong'));
      expect(state.error).toBe('Something went wrong');
      expect(state.loading).toBe(false);
    });

    it('should clear error with null', () => {
      const prev = { data: [], loading: false, error: 'old' };
      const state = reducer(prev, setError(null));
      expect(state.error).toBeNull();
      expect(state.loading).toBe(false);
    });
  });
});
