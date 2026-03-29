import { ChallengeParticipant } from '../../types';

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
  setParticipants,
  addParticipant,
  importParticipant,
  updateParticipant,
  removeParticipant,
  updateParticipantStats,
  setLoading,
  setError,
} from '../../redux/slices/participantsSlice';
import { saveParticipants } from '../../utils/storage';

const makeParticipant = (overrides: Partial<ChallengeParticipant> = {}): ChallengeParticipant => ({
  id: 'p1',
  challengeId: 'c1',
  userId: 'u1',
  userName: 'User',
  totalPoints: 0,
  currentStreak: 0,
  longestStreak: 0,
  daysParticipated: 0,
  joinDate: '2024-01-01',
  ...overrides,
});

describe('participantsSlice', () => {
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

  describe('setParticipants', () => {
    it('should replace data, set loading=false, error=null', () => {
      const participants = [makeParticipant(), makeParticipant({ id: 'p2' })];
      const prev = { data: [], loading: true, error: 'old error' };
      const state = reducer(prev, setParticipants(participants));

      expect(state.data).toEqual(participants);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should call saveParticipants with the new data', () => {
      const participants = [makeParticipant()];
      reducer(initialState, setParticipants(participants));
      expect(saveParticipants).toHaveBeenCalledWith(participants);
    });

    it('should handle empty array', () => {
      const prev = { data: [makeParticipant()], loading: false, error: null };
      const state = reducer(prev, setParticipants([]));
      expect(state.data).toEqual([]);
    });
  });

  describe('addParticipant', () => {
    it('should append a new participant', () => {
      const existing = makeParticipant({ id: 'p1' });
      const newParticipant = makeParticipant({ id: 'p2', userName: 'New User' });
      const prev = { data: [existing], loading: false, error: null };
      const state = reducer(prev, addParticipant(newParticipant));

      expect(state.data).toHaveLength(2);
      expect(state.data[1]).toEqual(newParticipant);
    });

    it('should skip if duplicate ID exists', () => {
      const existing = makeParticipant({ id: 'p1', userName: 'Original' });
      const duplicate = makeParticipant({ id: 'p1', userName: 'Duplicate' });
      const prev = { data: [existing], loading: false, error: null };
      const state = reducer(prev, addParticipant(duplicate));

      expect(state.data).toHaveLength(1);
      expect(state.data[0].userName).toBe('Original');
    });

    it('should call saveParticipants', () => {
      reducer(initialState, addParticipant(makeParticipant()));
      expect(saveParticipants).toHaveBeenCalled();
    });
  });

  describe('importParticipant', () => {
    it('should append a new participant', () => {
      const participant = makeParticipant({ id: 'p3' });
      const state = reducer(initialState, importParticipant(participant));

      expect(state.data).toHaveLength(1);
      expect(state.data[0]).toEqual(participant);
    });

    it('should skip if duplicate ID exists', () => {
      const existing = makeParticipant({ id: 'p1', userName: 'Existing' });
      const duplicate = makeParticipant({ id: 'p1', userName: 'Imported' });
      const prev = { data: [existing], loading: false, error: null };
      const state = reducer(prev, importParticipant(duplicate));

      expect(state.data).toHaveLength(1);
      expect(state.data[0].userName).toBe('Existing');
    });

    it('should call saveParticipants', () => {
      reducer(initialState, importParticipant(makeParticipant()));
      expect(saveParticipants).toHaveBeenCalled();
    });
  });

  describe('updateParticipant', () => {
    it('should update matching participant and set updatedAt', () => {
      const original = makeParticipant({ id: 'p1', userName: 'Original' });
      const updated = makeParticipant({ id: 'p1', userName: 'Updated' });
      const prev = { data: [original], loading: false, error: null };
      const state = reducer(prev, updateParticipant(updated));

      expect(state.data[0].userName).toBe('Updated');
      expect(state.data[0].updatedAt).toBeDefined();
      expect(typeof state.data[0].updatedAt).toBe('string');
    });

    it('should not modify other participants', () => {
      const p1 = makeParticipant({ id: 'p1', userName: 'First' });
      const p2 = makeParticipant({ id: 'p2', userName: 'Second' });
      const updated = makeParticipant({ id: 'p1', userName: 'Updated First' });
      const prev = { data: [p1, p2], loading: false, error: null };
      const state = reducer(prev, updateParticipant(updated));

      expect(state.data[0].userName).toBe('Updated First');
      expect(state.data[1].userName).toBe('Second');
    });

    it('should be a no-op if participant not found', () => {
      const original = makeParticipant({ id: 'p1' });
      const notFound = makeParticipant({ id: 'p999', userName: 'Ghost' });
      const prev = { data: [original], loading: false, error: null };
      const state = reducer(prev, updateParticipant(notFound));

      expect(state.data).toHaveLength(1);
      expect(state.data[0].id).toBe('p1');
    });

    it('should call saveParticipants when participant found', () => {
      const prev = { data: [makeParticipant()], loading: false, error: null };
      reducer(prev, updateParticipant(makeParticipant({ id: 'p1', userName: 'Updated' })));
      expect(saveParticipants).toHaveBeenCalled();
    });

    it('should not call saveParticipants when participant not found', () => {
      const prev = { data: [makeParticipant()], loading: false, error: null };
      reducer(prev, updateParticipant(makeParticipant({ id: 'p999' })));
      expect(saveParticipants).not.toHaveBeenCalled();
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant by ID', () => {
      const p1 = makeParticipant({ id: 'p1' });
      const p2 = makeParticipant({ id: 'p2' });
      const prev = { data: [p1, p2], loading: false, error: null };
      const state = reducer(prev, removeParticipant('p1'));

      expect(state.data).toHaveLength(1);
      expect(state.data[0].id).toBe('p2');
    });

    it('should be a no-op if ID not found', () => {
      const prev = { data: [makeParticipant()], loading: false, error: null };
      const state = reducer(prev, removeParticipant('p999'));
      expect(state.data).toHaveLength(1);
    });

    it('should call saveParticipants', () => {
      const prev = { data: [makeParticipant()], loading: false, error: null };
      reducer(prev, removeParticipant('p1'));
      expect(saveParticipants).toHaveBeenCalled();
    });

    it('should handle removing from empty array', () => {
      const state = reducer(initialState, removeParticipant('p1'));
      expect(state.data).toEqual([]);
    });
  });

  describe('updateParticipantStats', () => {
    it('should update stats fields and set updatedAt', () => {
      const original = makeParticipant({
        id: 'p1',
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        daysParticipated: 0,
      });
      const prev = { data: [original], loading: false, error: null };
      const state = reducer(
        prev,
        updateParticipantStats({
          id: 'p1',
          totalPoints: 15,
          currentStreak: 3,
          longestStreak: 5,
          daysParticipated: 10,
          lastCheckinDate: '2024-06-15',
        })
      );

      expect(state.data[0].totalPoints).toBe(15);
      expect(state.data[0].currentStreak).toBe(3);
      expect(state.data[0].longestStreak).toBe(5);
      expect(state.data[0].daysParticipated).toBe(10);
      expect(state.data[0].lastCheckinDate).toBe('2024-06-15');
      expect(state.data[0].updatedAt).toBeDefined();
    });

    it('should not modify other participants', () => {
      const p1 = makeParticipant({ id: 'p1', totalPoints: 0 });
      const p2 = makeParticipant({ id: 'p2', totalPoints: 50 });
      const prev = { data: [p1, p2], loading: false, error: null };
      const state = reducer(
        prev,
        updateParticipantStats({
          id: 'p1',
          totalPoints: 10,
          currentStreak: 1,
          longestStreak: 1,
          daysParticipated: 1,
          lastCheckinDate: '2024-06-15',
        })
      );

      expect(state.data[0].totalPoints).toBe(10);
      expect(state.data[1].totalPoints).toBe(50);
    });

    it('should be a no-op if participant not found', () => {
      const original = makeParticipant({ id: 'p1', totalPoints: 5 });
      const prev = { data: [original], loading: false, error: null };
      const state = reducer(
        prev,
        updateParticipantStats({
          id: 'p999',
          totalPoints: 100,
          currentStreak: 99,
          longestStreak: 99,
          daysParticipated: 99,
          lastCheckinDate: '2024-12-31',
        })
      );

      expect(state.data[0].totalPoints).toBe(5);
    });

    it('should not call saveParticipants if participant not found', () => {
      const prev = { data: [makeParticipant()], loading: false, error: null };
      reducer(
        prev,
        updateParticipantStats({
          id: 'p999',
          totalPoints: 100,
          currentStreak: 99,
          longestStreak: 99,
          daysParticipated: 99,
          lastCheckinDate: '2024-12-31',
        })
      );
      expect(saveParticipants).not.toHaveBeenCalled();
    });

    it('should call saveParticipants when participant found', () => {
      const prev = { data: [makeParticipant()], loading: false, error: null };
      reducer(
        prev,
        updateParticipantStats({
          id: 'p1',
          totalPoints: 10,
          currentStreak: 1,
          longestStreak: 1,
          daysParticipated: 1,
          lastCheckinDate: '2024-06-15',
        })
      );
      expect(saveParticipants).toHaveBeenCalled();
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
