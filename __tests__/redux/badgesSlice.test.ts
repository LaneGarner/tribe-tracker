import { BadgeDefinition, UserBadge } from '../../types';

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
  setBadges,
  addEarnedBadge,
  clearBadges,
  setLoading,
  setError,
  calculateLevel,
  getLevelTitle,
  getPointsForNextLevel,
} from '../../redux/slices/badgesSlice';
import { saveBadgeDefinitions, saveBadges } from '../../utils/storage';

const makeBadgeDef = (overrides: Partial<BadgeDefinition> = {}): BadgeDefinition => ({
  id: 'bd1',
  slug: 'first-checkin',
  name: 'First Check-in',
  description: 'desc',
  category: 'onboarding',
  iconName: 'check',
  iconColor: '#10B981',
  borderColor: '#10B981',
  points: 5,
  requirementType: 'event',
  sortOrder: 1,
  ...overrides,
});

const makeUserBadge = (overrides: Partial<UserBadge> = {}): UserBadge => ({
  id: 'ub1',
  badgeId: 'bd1',
  earnedAt: '2024-06-15T00:00:00Z',
  ...overrides,
});

describe('badgesSlice', () => {
  const initialState = {
    definitions: [],
    earned: [],
    totalPoints: 0,
    level: 1,
    loading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exported utility functions', () => {
    describe('calculateLevel', () => {
      it('should return 1 for 0 points', () => {
        expect(calculateLevel(0)).toBe(1);
      });

      it('should return 1 for 9 points', () => {
        expect(calculateLevel(9)).toBe(1);
      });

      it('should return 2 for 10 points', () => {
        expect(calculateLevel(10)).toBe(2);
      });

      it('should return 3 for 25 points', () => {
        expect(calculateLevel(25)).toBe(3);
      });

      it('should return 7 for 69 points', () => {
        expect(calculateLevel(69)).toBe(7);
      });

      it('should handle large point values', () => {
        expect(calculateLevel(100)).toBe(11);
      });
    });

    describe('getLevelTitle', () => {
      it('should return Newcomer for level 1', () => {
        expect(getLevelTitle(1)).toBe('Newcomer');
      });

      it('should return Regular for level 2', () => {
        expect(getLevelTitle(2)).toBe('Regular');
      });

      it('should return Committed for level 3', () => {
        expect(getLevelTitle(3)).toBe('Committed');
      });

      it('should return Dedicated for level 4', () => {
        expect(getLevelTitle(4)).toBe('Dedicated');
      });

      it('should return Consistent for level 5', () => {
        expect(getLevelTitle(5)).toBe('Consistent');
      });

      it('should return Veteran for level 6', () => {
        expect(getLevelTitle(6)).toBe('Veteran');
      });

      it('should return Elite for level 7', () => {
        expect(getLevelTitle(7)).toBe('Elite');
      });

      it('should cap at Elite for levels above 7', () => {
        expect(getLevelTitle(99)).toBe('Elite');
      });
    });

    describe('getPointsForNextLevel', () => {
      it('should return 10 for 0 points (need 10 to reach level 2)', () => {
        expect(getPointsForNextLevel(0)).toBe(10);
      });

      it('should return 5 for 5 points', () => {
        expect(getPointsForNextLevel(5)).toBe(5);
      });

      it('should return 10 for 10 points (need 10 more to reach level 3)', () => {
        expect(getPointsForNextLevel(10)).toBe(10);
      });

      it('should return 5 for 15 points', () => {
        expect(getPointsForNextLevel(15)).toBe(5);
      });

      it('should return 1 for 9 points', () => {
        expect(getPointsForNextLevel(9)).toBe(1);
      });

      it('should return 10 for 20 points', () => {
        expect(getPointsForNextLevel(20)).toBe(10);
      });
    });
  });

  describe('initial state', () => {
    it('should return the initial state', () => {
      const state = reducer(undefined, { type: 'unknown' });
      expect(state).toEqual(initialState);
    });
  });

  describe('setBadges', () => {
    it('should set definitions, earned, totalPoints, level, and clear loading/error', () => {
      const definitions = [makeBadgeDef()];
      const earned = [makeUserBadge()];
      const prev = { ...initialState, loading: true, error: 'old' };
      const state = reducer(
        prev,
        setBadges({ definitions, earned, totalPoints: 15, level: 2 })
      );

      expect(state.definitions).toEqual(definitions);
      expect(state.earned).toEqual(earned);
      expect(state.totalPoints).toBe(15);
      expect(state.level).toBe(2);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should call saveBadgeDefinitions and saveBadges', () => {
      const definitions = [makeBadgeDef()];
      const earned = [makeUserBadge()];
      reducer(initialState, setBadges({ definitions, earned, totalPoints: 5, level: 1 }));

      expect(saveBadgeDefinitions).toHaveBeenCalledWith(definitions);
      expect(saveBadges).toHaveBeenCalledWith(earned);
    });
  });

  describe('addEarnedBadge', () => {
    it('should add badge and increment totalPoints by definition points', () => {
      const def = makeBadgeDef({ id: 'bd1', points: 5 });
      const badge = makeUserBadge({ id: 'ub1', badgeId: 'bd1' });
      const prev = { ...initialState, definitions: [def], totalPoints: 0, level: 1 };
      const state = reducer(prev, addEarnedBadge(badge));

      expect(state.earned).toHaveLength(1);
      expect(state.earned[0]).toEqual(badge);
      expect(state.totalPoints).toBe(5);
      expect(state.level).toBe(1); // 5 points = level 1
    });

    it('should recalculate level when crossing threshold', () => {
      const def = makeBadgeDef({ id: 'bd1', points: 10 });
      const badge = makeUserBadge({ id: 'ub1', badgeId: 'bd1' });
      const prev = { ...initialState, definitions: [def], totalPoints: 5, level: 1 };
      const state = reducer(prev, addEarnedBadge(badge));

      expect(state.totalPoints).toBe(15);
      expect(state.level).toBe(2); // 15 points = level 2
    });

    it('should skip duplicate badge (same badgeId + challengeId combo)', () => {
      const def = makeBadgeDef({ id: 'bd1', points: 5 });
      const existingBadge = makeUserBadge({ id: 'ub1', badgeId: 'bd1', challengeId: 'c1' });
      const duplicateBadge = makeUserBadge({ id: 'ub2', badgeId: 'bd1', challengeId: 'c1' });
      const prev = {
        ...initialState,
        definitions: [def],
        earned: [existingBadge],
        totalPoints: 5,
        level: 1,
      };
      const state = reducer(prev, addEarnedBadge(duplicateBadge));

      expect(state.earned).toHaveLength(1);
      expect(state.totalPoints).toBe(5); // unchanged
    });

    it('should allow same badgeId with different challengeId (placement badges)', () => {
      const def = makeBadgeDef({ id: 'bd1', points: 5 });
      const badge1 = makeUserBadge({ id: 'ub1', badgeId: 'bd1', challengeId: 'c1' });
      const badge2 = makeUserBadge({ id: 'ub2', badgeId: 'bd1', challengeId: 'c2' });
      const prev = {
        ...initialState,
        definitions: [def],
        earned: [badge1],
        totalPoints: 5,
        level: 1,
      };
      const state = reducer(prev, addEarnedBadge(badge2));

      expect(state.earned).toHaveLength(2);
      expect(state.totalPoints).toBe(10);
      expect(state.level).toBe(2); // 10 points = level 2
    });

    it('should add badge but not change points/level if definition not found', () => {
      const badge = makeUserBadge({ id: 'ub1', badgeId: 'bd-unknown' });
      const prev = { ...initialState, definitions: [], totalPoints: 5, level: 1 };
      const state = reducer(prev, addEarnedBadge(badge));

      expect(state.earned).toHaveLength(1);
      expect(state.totalPoints).toBe(5); // unchanged
      expect(state.level).toBe(1); // unchanged
    });

    it('should call saveBadges when badge added', () => {
      const def = makeBadgeDef({ id: 'bd1', points: 5 });
      const badge = makeUserBadge({ id: 'ub1', badgeId: 'bd1' });
      const prev = { ...initialState, definitions: [def] };
      reducer(prev, addEarnedBadge(badge));

      expect(saveBadges).toHaveBeenCalled();
    });

    it('should not call saveBadges when badge is duplicate', () => {
      const def = makeBadgeDef({ id: 'bd1', points: 5 });
      const existingBadge = makeUserBadge({ id: 'ub1', badgeId: 'bd1', challengeId: 'c1' });
      const prev = {
        ...initialState,
        definitions: [def],
        earned: [existingBadge],
        totalPoints: 5,
      };
      reducer(prev, addEarnedBadge(makeUserBadge({ id: 'ub2', badgeId: 'bd1', challengeId: 'c1' })));

      expect(saveBadges).not.toHaveBeenCalled();
    });

    it('should handle badge without challengeId (non-challenge badges)', () => {
      const def = makeBadgeDef({ id: 'bd1', points: 5 });
      const badge1 = makeUserBadge({ id: 'ub1', badgeId: 'bd1' }); // no challengeId
      const badge2 = makeUserBadge({ id: 'ub2', badgeId: 'bd1' }); // same, no challengeId
      const prev = {
        ...initialState,
        definitions: [def],
        earned: [badge1],
        totalPoints: 5,
      };
      const state = reducer(prev, addEarnedBadge(badge2));

      // Both have undefined challengeId, so they match as duplicates
      expect(state.earned).toHaveLength(1);
      expect(state.totalPoints).toBe(5);
    });
  });

  describe('clearBadges', () => {
    it('should reset all state to initial values', () => {
      const prev = {
        definitions: [makeBadgeDef()],
        earned: [makeUserBadge()],
        totalPoints: 25,
        level: 3,
        loading: true,
        error: 'some error',
      };
      const state = reducer(prev, clearBadges());

      expect(state).toEqual(initialState);
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
      const state = reducer({ ...initialState, loading: true }, setError('Badge error'));
      expect(state.error).toBe('Badge error');
      expect(state.loading).toBe(false);
    });

    it('should clear error with null', () => {
      const prev = { ...initialState, error: 'old' };
      const state = reducer(prev, setError(null));
      expect(state.error).toBeNull();
    });
  });
});
