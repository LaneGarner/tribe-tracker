import { HabitCheckin } from '../../types';

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
  setCheckins,
  addCheckin,
  updateCheckin,
  updateHabitCompletion,
  deleteCheckin,
  setLoading,
  setError,
} from '../../redux/slices/checkinsSlice';
import { saveCheckins } from '../../utils/storage';

const makeCheckin = (overrides: Partial<HabitCheckin> = {}): HabitCheckin => ({
  id: 'ci1',
  challengeId: 'c1',
  userId: 'u1',
  checkinDate: '2024-06-15',
  habitsCompleted: [false, false, false],
  pointsEarned: 0,
  allHabitsCompleted: false,
  ...overrides,
});

describe('checkinsSlice', () => {
  const initialState = { data: [], loading: false, error: null };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return the initial state', () => {
      const state = reducer(undefined, { type: 'unknown' });
      expect(state).toEqual(initialState);
    });
  });

  describe('setCheckins', () => {
    it('should replace data, set loading=false, error=null', () => {
      const checkins = [makeCheckin(), makeCheckin({ id: 'ci2' })];
      const prev = { data: [], loading: true, error: 'old error' };
      const state = reducer(prev, setCheckins(checkins));

      expect(state.data).toEqual(checkins);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should call saveCheckins', () => {
      const checkins = [makeCheckin()];
      reducer(initialState, setCheckins(checkins));
      expect(saveCheckins).toHaveBeenCalledWith(checkins);
    });

    it('should handle empty array', () => {
      const prev = { data: [makeCheckin()], loading: false, error: null };
      const state = reducer(prev, setCheckins([]));
      expect(state.data).toEqual([]);
    });
  });

  describe('addCheckin', () => {
    describe('new checkin (no existing match)', () => {
      it('should append a new checkin', () => {
        const existing = makeCheckin({ id: 'ci1', challengeId: 'c1', userId: 'u1', checkinDate: '2024-06-14' });
        const newCheckin = makeCheckin({ id: 'ci2', challengeId: 'c1', userId: 'u1', checkinDate: '2024-06-15' });
        const prev = { data: [existing], loading: false, error: null };
        const state = reducer(prev, addCheckin(newCheckin));

        expect(state.data).toHaveLength(2);
      });

      it('should append when different challengeId', () => {
        const existing = makeCheckin({ id: 'ci1', challengeId: 'c1', userId: 'u1', checkinDate: '2024-06-15' });
        const newCheckin = makeCheckin({ id: 'ci2', challengeId: 'c2', userId: 'u1', checkinDate: '2024-06-15' });
        const prev = { data: [existing], loading: false, error: null };
        const state = reducer(prev, addCheckin(newCheckin));

        expect(state.data).toHaveLength(2);
      });

      it('should append when different userId', () => {
        const existing = makeCheckin({ id: 'ci1', challengeId: 'c1', userId: 'u1', checkinDate: '2024-06-15' });
        const newCheckin = makeCheckin({ id: 'ci2', challengeId: 'c1', userId: 'u2', checkinDate: '2024-06-15' });
        const prev = { data: [existing], loading: false, error: null };
        const state = reducer(prev, addCheckin(newCheckin));

        expect(state.data).toHaveLength(2);
      });
    });

    describe('upsert (existing match by composite key)', () => {
      it('should replace in-place when same challengeId/userId/checkinDate', () => {
        const existing = makeCheckin({
          id: 'ci1',
          challengeId: 'c1',
          userId: 'u1',
          checkinDate: '2024-06-15',
          habitsCompleted: [false, false, false],
          pointsEarned: 0,
        });
        const updated = makeCheckin({
          id: 'ci1-new',
          challengeId: 'c1',
          userId: 'u1',
          checkinDate: '2024-06-15',
          habitsCompleted: [true, true, false],
          pointsEarned: 2,
        });
        const prev = { data: [existing], loading: false, error: null };
        const state = reducer(prev, addCheckin(updated));

        expect(state.data).toHaveLength(1);
        expect(state.data[0].id).toBe('ci1-new');
        expect(state.data[0].pointsEarned).toBe(2);
        expect(state.data[0].updatedAt).toBeDefined();
      });

      it('should treat cycle=null and cycle=1 as the same (via ?? 1)', () => {
        const existing = makeCheckin({
          id: 'ci1',
          challengeId: 'c1',
          userId: 'u1',
          checkinDate: '2024-06-15',
          cycle: undefined,
        });
        const updated = makeCheckin({
          id: 'ci2',
          challengeId: 'c1',
          userId: 'u1',
          checkinDate: '2024-06-15',
          cycle: 1,
        });
        const prev = { data: [existing], loading: false, error: null };
        const state = reducer(prev, addCheckin(updated));

        expect(state.data).toHaveLength(1);
        expect(state.data[0].id).toBe('ci2');
      });

      it('should treat different cycles as separate checkins', () => {
        const cycle1 = makeCheckin({
          id: 'ci1',
          challengeId: 'c1',
          userId: 'u1',
          checkinDate: '2024-06-15',
          cycle: 1,
        });
        const cycle2 = makeCheckin({
          id: 'ci2',
          challengeId: 'c1',
          userId: 'u1',
          checkinDate: '2024-06-15',
          cycle: 2,
        });
        const prev = { data: [cycle1], loading: false, error: null };
        const state = reducer(prev, addCheckin(cycle2));

        expect(state.data).toHaveLength(2);
      });

      it('should preserve position in array during upsert', () => {
        const first = makeCheckin({ id: 'ci-first', challengeId: 'c1', userId: 'u1', checkinDate: '2024-06-14' });
        const target = makeCheckin({ id: 'ci-target', challengeId: 'c1', userId: 'u1', checkinDate: '2024-06-15' });
        const last = makeCheckin({ id: 'ci-last', challengeId: 'c1', userId: 'u1', checkinDate: '2024-06-16' });
        const updated = makeCheckin({ id: 'ci-updated', challengeId: 'c1', userId: 'u1', checkinDate: '2024-06-15', pointsEarned: 3 });

        const prev = { data: [first, target, last], loading: false, error: null };
        const state = reducer(prev, addCheckin(updated));

        expect(state.data).toHaveLength(3);
        expect(state.data[1].id).toBe('ci-updated');
        expect(state.data[1].pointsEarned).toBe(3);
      });
    });

    it('should call saveCheckins', () => {
      reducer(initialState, addCheckin(makeCheckin()));
      expect(saveCheckins).toHaveBeenCalled();
    });
  });

  describe('updateCheckin', () => {
    it('should update matching checkin and set updatedAt', () => {
      const original = makeCheckin({ id: 'ci1', pointsEarned: 0 });
      const updated = makeCheckin({ id: 'ci1', pointsEarned: 3 });
      const prev = { data: [original], loading: false, error: null };
      const state = reducer(prev, updateCheckin(updated));

      expect(state.data[0].pointsEarned).toBe(3);
      expect(state.data[0].updatedAt).toBeDefined();
    });

    it('should be a no-op if checkin not found', () => {
      const original = makeCheckin({ id: 'ci1' });
      const notFound = makeCheckin({ id: 'ci999' });
      const prev = { data: [original], loading: false, error: null };
      const state = reducer(prev, updateCheckin(notFound));

      expect(state.data).toHaveLength(1);
      expect(state.data[0].id).toBe('ci1');
    });

    it('should call saveCheckins when found', () => {
      const prev = { data: [makeCheckin()], loading: false, error: null };
      reducer(prev, updateCheckin(makeCheckin({ id: 'ci1', pointsEarned: 2 })));
      expect(saveCheckins).toHaveBeenCalled();
    });

    it('should not call saveCheckins when not found', () => {
      const prev = { data: [makeCheckin()], loading: false, error: null };
      reducer(prev, updateCheckin(makeCheckin({ id: 'ci999' })));
      expect(saveCheckins).not.toHaveBeenCalled();
    });
  });

  describe('updateHabitCompletion', () => {
    it('should toggle habitsCompleted at the given index', () => {
      const checkin = makeCheckin({
        id: 'ci1',
        habitsCompleted: [false, false, false],
        pointsEarned: 0,
        allHabitsCompleted: false,
      });
      const prev = { data: [checkin], loading: false, error: null };
      const state = reducer(
        prev,
        updateHabitCompletion({ checkinId: 'ci1', habitIndex: 1, completed: true })
      );

      expect(state.data[0].habitsCompleted).toEqual([false, true, false]);
    });

    it('should recalculate pointsEarned as count of true habits', () => {
      const checkin = makeCheckin({
        id: 'ci1',
        habitsCompleted: [true, false, false],
        pointsEarned: 1,
      });
      const prev = { data: [checkin], loading: false, error: null };
      const state = reducer(
        prev,
        updateHabitCompletion({ checkinId: 'ci1', habitIndex: 2, completed: true })
      );

      expect(state.data[0].pointsEarned).toBe(2);
    });

    it('should set allHabitsCompleted=true when all habits are completed', () => {
      const checkin = makeCheckin({
        id: 'ci1',
        habitsCompleted: [true, true, false],
        pointsEarned: 2,
        allHabitsCompleted: false,
      });
      const prev = { data: [checkin], loading: false, error: null };
      const state = reducer(
        prev,
        updateHabitCompletion({ checkinId: 'ci1', habitIndex: 2, completed: true })
      );

      expect(state.data[0].allHabitsCompleted).toBe(true);
      expect(state.data[0].pointsEarned).toBe(3);
    });

    it('should set allHabitsCompleted=false when not all habits completed', () => {
      const checkin = makeCheckin({
        id: 'ci1',
        habitsCompleted: [true, true, true],
        pointsEarned: 3,
        allHabitsCompleted: true,
      });
      const prev = { data: [checkin], loading: false, error: null };
      const state = reducer(
        prev,
        updateHabitCompletion({ checkinId: 'ci1', habitIndex: 0, completed: false })
      );

      expect(state.data[0].allHabitsCompleted).toBe(false);
      expect(state.data[0].pointsEarned).toBe(2);
    });

    it('should set updatedAt', () => {
      const checkin = makeCheckin({ id: 'ci1', habitsCompleted: [false] });
      const prev = { data: [checkin], loading: false, error: null };
      const state = reducer(
        prev,
        updateHabitCompletion({ checkinId: 'ci1', habitIndex: 0, completed: true })
      );

      expect(state.data[0].updatedAt).toBeDefined();
    });

    it('should be a no-op if checkinId not found', () => {
      const checkin = makeCheckin({ id: 'ci1', habitsCompleted: [false] });
      const prev = { data: [checkin], loading: false, error: null };
      const state = reducer(
        prev,
        updateHabitCompletion({ checkinId: 'ci999', habitIndex: 0, completed: true })
      );

      expect(state.data[0].habitsCompleted).toEqual([false]);
    });

    it('should call saveCheckins when checkin found', () => {
      const checkin = makeCheckin({ id: 'ci1', habitsCompleted: [false] });
      const prev = { data: [checkin], loading: false, error: null };
      reducer(prev, updateHabitCompletion({ checkinId: 'ci1', habitIndex: 0, completed: true }));
      expect(saveCheckins).toHaveBeenCalled();
    });

    it('should not call saveCheckins when checkin not found', () => {
      const prev = { data: [makeCheckin()], loading: false, error: null };
      reducer(prev, updateHabitCompletion({ checkinId: 'ci999', habitIndex: 0, completed: true }));
      expect(saveCheckins).not.toHaveBeenCalled();
    });
  });

  describe('deleteCheckin', () => {
    it('should remove checkin by ID', () => {
      const ci1 = makeCheckin({ id: 'ci1' });
      const ci2 = makeCheckin({ id: 'ci2' });
      const prev = { data: [ci1, ci2], loading: false, error: null };
      const state = reducer(prev, deleteCheckin('ci1'));

      expect(state.data).toHaveLength(1);
      expect(state.data[0].id).toBe('ci2');
    });

    it('should be a no-op if ID not found', () => {
      const prev = { data: [makeCheckin()], loading: false, error: null };
      const state = reducer(prev, deleteCheckin('ci999'));
      expect(state.data).toHaveLength(1);
    });

    it('should call saveCheckins', () => {
      const prev = { data: [makeCheckin()], loading: false, error: null };
      reducer(prev, deleteCheckin('ci1'));
      expect(saveCheckins).toHaveBeenCalled();
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
      const state = reducer({ ...initialState, loading: true }, setError('Failed'));
      expect(state.error).toBe('Failed');
      expect(state.loading).toBe(false);
    });

    it('should clear error with null', () => {
      const prev = { data: [], loading: false, error: 'old' };
      const state = reducer(prev, setError(null));
      expect(state.error).toBeNull();
    });
  });
});
