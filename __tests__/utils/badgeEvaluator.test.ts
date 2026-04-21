jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => `badge-${Date.now()}-${Math.random()}`),
}));
jest.mock('../../config/api', () => ({
  API_URL: 'https://test-api.vercel.app',
}));

import { evaluateNewBadges } from '../../utils/badgeEvaluator';

// ---- Factories ----

const makeState = (overrides: any = {}): any => ({
  challenges: { data: [], loading: false, error: null },
  participants: { data: [], loading: false, error: null },
  checkins: { data: [], loading: false, error: null },
  profile: { data: null, loading: false, error: null },
  badges: {
    definitions: [],
    earned: [],
    totalPoints: 0,
    level: 1,
    loading: false,
    error: null,
  },
  chat: {
    conversations: [],
    messages: {},
    blockedUsers: [],
    loading: false,
    error: null,
    messageCursors: {},
    hasMoreMessages: {},
    activeConversationId: null,
  },
  ...overrides,
});

const makeBadgeDef = (overrides: any = {}) => ({
  id: 'bd1',
  slug: 'first_checkin',
  name: 'First Step',
  description: 'desc',
  category: 'onboarding',
  iconName: 'zap',
  iconColor: '#10B981',
  borderColor: '#10B981',
  points: 1,
  requirementType: 'event' as const,
  requirementValue: 1,
  sortOrder: 1,
  ...overrides,
});

const makeParticipant = (overrides: any = {}) => ({
  id: 'p1',
  challengeId: 'ch1',
  userId: 'user-1',
  totalPoints: 0,
  longestStreak: 0,
  joinDate: '2024-06-01',
  ...overrides,
});

const USER_ID = 'user-1';

// ---- Tests ----

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('evaluateNewBadges', () => {
  // ==================== Empty / base cases ====================

  describe('empty / base cases', () => {
    it('returns [] when no badge definitions exist', () => {
      const state = makeState();
      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });

    it('returns [] when definitions exist but no stats qualify', () => {
      const state = makeState({
        badges: {
          definitions: [makeBadgeDef()],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
      });
      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });
  });

  // ==================== Onboarding milestones (event) ====================

  describe('onboarding milestones', () => {
    it('earns first_checkin badge with 1 checkin', () => {
      const state = makeState({
        badges: {
          definitions: [makeBadgeDef()],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        checkins: {
          data: [{ id: 'c1', challengeId: 'ch1', userId: USER_ID, checkinDate: '2024-06-15' }],
          loading: false,
          error: null,
        },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd1');
      expect(result[0].earnedAt).toBeDefined();
    });

    it('does NOT earn first_checkin badge with 0 checkins', () => {
      const state = makeState({
        badges: {
          definitions: [makeBadgeDef()],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
      });

      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });

    it('earns first_challenge badge with 1 participant entry', () => {
      const def = makeBadgeDef({
        id: 'bd-join',
        slug: 'first_challenge',
        requirementType: 'event',
        requirementValue: 1,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        participants: { data: [makeParticipant()], loading: false, error: null },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-join');
    });

    it('earns profile_complete badge when all fields filled', () => {
      const def = makeBadgeDef({
        id: 'bd-profile',
        slug: 'profile_complete',
        requirementType: 'event',
        requirementValue: 1,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        profile: {
          data: {
            id: USER_ID,
            email: 'test@test.com',
            fullName: 'Test User',
            bio: 'Hello world',
            profilePhotoUrl: 'https://example.com/photo.jpg',
          },
          loading: false,
          error: null,
        },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-profile');
    });

    it('does NOT earn profile_complete badge when bio is missing', () => {
      const def = makeBadgeDef({
        id: 'bd-profile',
        slug: 'profile_complete',
        requirementType: 'event',
        requirementValue: 1,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        profile: {
          data: {
            id: USER_ID,
            email: 'test@test.com',
            fullName: 'Test User',
            bio: '',
            profilePhotoUrl: 'https://example.com/photo.jpg',
          },
          loading: false,
          error: null,
        },
      });

      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });

    it('does NOT earn profile_complete badge when profilePhotoUrl is missing', () => {
      const def = makeBadgeDef({
        id: 'bd-profile',
        slug: 'profile_complete',
        requirementType: 'event',
        requirementValue: 1,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        profile: {
          data: {
            id: USER_ID,
            email: 'test@test.com',
            fullName: 'Test User',
            bio: 'Hello',
            profilePhotoUrl: undefined,
          },
          loading: false,
          error: null,
        },
      });

      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });
  });

  // ==================== Tiered count badges ====================

  describe('tiered count badges: check-ins', () => {
    const checkinsBronze = makeBadgeDef({
      id: 'bd-cb',
      slug: 'checkins_bronze',
      category: 'volume',
      requirementType: 'count',
      requirementValue: 10,
      points: 1,
    });

    it('does NOT earn checkins_bronze with 1 check-in (threshold is 10)', () => {
      const state = makeState({
        badges: {
          definitions: [checkinsBronze],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        checkins: {
          data: [{ id: 'c1', challengeId: 'ch1', userId: USER_ID, checkinDate: '2024-06-15' }],
          loading: false,
          error: null,
        },
      });

      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });

    it('does NOT earn checkins_bronze with 9 check-ins', () => {
      const checkins = Array.from({ length: 9 }, (_, i) => ({
        id: `c${i}`,
        challengeId: 'ch1',
        userId: USER_ID,
        checkinDate: '2024-06-15',
      }));
      const state = makeState({
        badges: {
          definitions: [checkinsBronze],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        checkins: { data: checkins, loading: false, error: null },
      });

      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });

    it('earns checkins_bronze at exactly 10 check-ins', () => {
      const checkins = Array.from({ length: 10 }, (_, i) => ({
        id: `c${i}`,
        challengeId: 'ch1',
        userId: USER_ID,
        checkinDate: '2024-06-15',
      }));
      const state = makeState({
        badges: {
          definitions: [checkinsBronze],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        checkins: { data: checkins, loading: false, error: null },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-cb');
    });

    it('earns bronze AND silver at 50 check-ins, but NOT gold', () => {
      const checkinsSilver = makeBadgeDef({
        id: 'bd-cs',
        slug: 'checkins_silver',
        category: 'volume',
        requirementType: 'count',
        requirementValue: 50,
        points: 3,
      });
      const checkinsGold = makeBadgeDef({
        id: 'bd-cg',
        slug: 'checkins_gold',
        category: 'volume',
        requirementType: 'count',
        requirementValue: 200,
        points: 7,
      });

      const checkins = Array.from({ length: 50 }, (_, i) => ({
        id: `c${i}`,
        challengeId: 'ch1',
        userId: USER_ID,
        checkinDate: '2024-06-15',
      }));

      const state = makeState({
        badges: {
          definitions: [checkinsBronze, checkinsSilver, checkinsGold],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        checkins: { data: checkins, loading: false, error: null },
      });

      const result = evaluateNewBadges(state, USER_ID);
      const ids = result.map(b => b.badgeId).sort();
      expect(ids).toEqual(['bd-cb', 'bd-cs']);
    });
  });

  describe('tiered count badges: challenges joined', () => {
    it('does NOT earn challenges_joined_bronze with 2 participants (threshold is 3)', () => {
      const def = makeBadgeDef({
        id: 'bd-cjb',
        slug: 'challenges_joined_bronze',
        category: 'challenge',
        requirementType: 'count',
        requirementValue: 3,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        participants: {
          data: Array.from({ length: 2 }, (_, i) => makeParticipant({ id: `p${i}`, challengeId: `ch${i}` })),
          loading: false,
          error: null,
        },
      });

      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });

    it('earns challenges_joined_bronze at 3 participants', () => {
      const def = makeBadgeDef({
        id: 'bd-cjb',
        slug: 'challenges_joined_bronze',
        category: 'challenge',
        requirementType: 'count',
        requirementValue: 3,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        participants: {
          data: Array.from({ length: 3 }, (_, i) => makeParticipant({ id: `p${i}`, challengeId: `ch${i}` })),
          loading: false,
          error: null,
        },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-cjb');
    });

    it('earns challenges_joined_silver at 10 participants', () => {
      const def = makeBadgeDef({
        id: 'bd-cjs',
        slug: 'challenges_joined_silver',
        category: 'challenge',
        requirementType: 'count',
        requirementValue: 10,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        participants: {
          data: Array.from({ length: 10 }, (_, i) => makeParticipant({ id: `p${i}`, challengeId: `ch${i}` })),
          loading: false,
          error: null,
        },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-cjs');
    });
  });

  describe('tiered count badges: public challenges', () => {
    it('earns public_bronze when user creates 1 public challenge', () => {
      const def = makeBadgeDef({
        id: 'bd-pb',
        slug: 'public_bronze',
        category: 'social',
        requirementType: 'count',
        requirementValue: 1,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        challenges: {
          data: [
            { id: 'ch1', creatorId: USER_ID, name: 'Test', startDate: '2024-06-01', endDate: '2024-06-30', isPublic: true, habits: [] },
          ],
          loading: false,
          error: null,
        },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-pb');
    });

    it('does NOT earn public_bronze when challenge is private', () => {
      const def = makeBadgeDef({
        id: 'bd-pb',
        slug: 'public_bronze',
        category: 'social',
        requirementType: 'count',
        requirementValue: 1,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        challenges: {
          data: [
            { id: 'ch1', creatorId: USER_ID, name: 'Test', startDate: '2024-06-01', endDate: '2024-06-30', isPublic: false, habits: [] },
          ],
          loading: false,
          error: null,
        },
      });

      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });
  });

  describe('tiered count badges: challenges completed', () => {
    it('earns challenges_completed_bronze when user completes 1 challenge', () => {
      const def = makeBadgeDef({
        id: 'bd-ccb',
        slug: 'challenges_completed_bronze',
        category: 'challenge',
        requirementType: 'count',
        requirementValue: 1,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        challenges: {
          data: [
            { id: 'ch1', creatorId: 'other', name: 'Done', startDate: '2024-06-01', endDate: '2024-06-10', isPublic: false, habits: [] },
          ],
          loading: false,
          error: null,
        },
        participants: {
          data: [makeParticipant({ totalPoints: 10 })],
          loading: false,
          error: null,
        },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-ccb');
    });
  });

  // ==================== Streak badges ====================

  describe('tiered streak badges', () => {
    it('earns streak_bronze when longestStreak is 7', () => {
      const def = makeBadgeDef({
        id: 'bd-sb',
        slug: 'streak_bronze',
        category: 'streak',
        requirementType: 'streak',
        requirementValue: 7,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        participants: {
          data: [makeParticipant({ longestStreak: 7 })],
          loading: false,
          error: null,
        },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-sb');
    });

    it('does NOT earn streak_bronze when longestStreak is 6', () => {
      const def = makeBadgeDef({
        id: 'bd-sb',
        slug: 'streak_bronze',
        category: 'streak',
        requirementType: 'streak',
        requirementValue: 7,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        participants: {
          data: [makeParticipant({ longestStreak: 6 })],
          loading: false,
          error: null,
        },
      });

      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });

    it('earns streak_silver at 30-day streak', () => {
      const def = makeBadgeDef({
        id: 'bd-ss',
        slug: 'streak_silver',
        category: 'streak',
        requirementType: 'streak',
        requirementValue: 30,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        participants: {
          data: [makeParticipant({ longestStreak: 30 })],
          loading: false,
          error: null,
        },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-ss');
    });

    it('earns streak_gold at 100-day streak', () => {
      const def = makeBadgeDef({
        id: 'bd-sg',
        slug: 'streak_gold',
        category: 'streak',
        requirementType: 'streak',
        requirementValue: 100,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        participants: {
          data: [makeParticipant({ longestStreak: 100 })],
          loading: false,
          error: null,
        },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-sg');
    });
  });

  // ==================== Placement badges (single-earn, count-based) ====================

  describe('placement badges (single-earn per tier)', () => {
    const makeCompletedChallenges = (count: number, userRank: 1 | 2 | 3 | 4): any => {
      const challenges = Array.from({ length: count }, (_, i) => ({
        id: `ch${i}`,
        creatorId: 'other',
        name: `Challenge ${i}`,
        startDate: '2024-05-01',
        endDate: '2024-06-10', // completed (before fake today 2024-06-15)
        isPublic: false,
        habits: [],
      }));

      // Rank drives points: rank 1 → 100, rank 2 → 80, rank 3 → 60, rank 4 → 40
      const userPts = userRank === 1 ? 100 : userRank === 2 ? 80 : userRank === 3 ? 60 : 40;
      // Fill in other participants so user sits at the desired rank
      const participants = challenges.flatMap(ch => {
        const others = [];
        // Seed participants with higher-point entries to push user down
        for (let r = 1; r < userRank; r++) {
          const pts = r === 1 ? 100 : r === 2 ? 80 : 60;
          others.push({
            id: `p-${ch.id}-other-${r}`,
            challengeId: ch.id,
            userId: `other-${r}`,
            totalPoints: pts,
            longestStreak: 0,
            joinDate: '2024-05-01',
          });
        }
        return [
          ...others,
          makeParticipant({ id: `p-${ch.id}-user`, challengeId: ch.id, totalPoints: userPts }),
        ];
      });

      return { challenges, participants };
    };

    it('earns podium_bronze after 1 top-3 finish', () => {
      const def = makeBadgeDef({
        id: 'bd-pdb',
        slug: 'podium_bronze',
        category: 'challenge',
        requirementType: 'count',
        requirementValue: 1,
      });
      const { challenges, participants } = makeCompletedChallenges(1, 1);

      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        challenges: { data: challenges, loading: false, error: null },
        participants: { data: participants, loading: false, error: null },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-pdb');
      // Crucial: NOT per-challenge — challengeId must be undefined
      expect(result[0].challengeId).toBeUndefined();
    });

    it('awards podium_bronze only ONCE even after 5 podium finishes', () => {
      const def = makeBadgeDef({
        id: 'bd-pdb',
        slug: 'podium_bronze',
        category: 'challenge',
        requirementType: 'count',
        requirementValue: 1,
      });
      const { challenges, participants } = makeCompletedChallenges(5, 1);

      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        challenges: { data: challenges, loading: false, error: null },
        participants: { data: participants, loading: false, error: null },
      });

      const result = evaluateNewBadges(state, USER_ID);
      // Previously the per-challenge bug would award 5. Now: exactly 1.
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-pdb');
    });

    it('does NOT earn podium_silver with only 4 podium finishes (threshold is 5)', () => {
      const def = makeBadgeDef({
        id: 'bd-pds',
        slug: 'podium_silver',
        category: 'challenge',
        requirementType: 'count',
        requirementValue: 5,
      });
      const { challenges, participants } = makeCompletedChallenges(4, 2);

      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        challenges: { data: challenges, loading: false, error: null },
        participants: { data: participants, loading: false, error: null },
      });

      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });

    it('earns podium_silver at 5 podium finishes', () => {
      const def = makeBadgeDef({
        id: 'bd-pds',
        slug: 'podium_silver',
        category: 'challenge',
        requirementType: 'count',
        requirementValue: 5,
      });
      const { challenges, participants } = makeCompletedChallenges(5, 2);

      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        challenges: { data: challenges, loading: false, error: null },
        participants: { data: participants, loading: false, error: null },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-pds');
    });

    it('does NOT earn podium badge when rank is 4+', () => {
      const def = makeBadgeDef({
        id: 'bd-pdb',
        slug: 'podium_bronze',
        category: 'challenge',
        requirementType: 'count',
        requirementValue: 1,
      });
      const { challenges, participants } = makeCompletedChallenges(1, 4);

      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        challenges: { data: challenges, loading: false, error: null },
        participants: { data: participants, loading: false, error: null },
      });

      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });

    it('earns wins_bronze after 1 first-place finish', () => {
      const def = makeBadgeDef({
        id: 'bd-wb',
        slug: 'wins_bronze',
        category: 'challenge',
        requirementType: 'count',
        requirementValue: 1,
      });
      const { challenges, participants } = makeCompletedChallenges(1, 1);

      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        challenges: { data: challenges, loading: false, error: null },
        participants: { data: participants, loading: false, error: null },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-wb');
    });

    it('does NOT earn wins_bronze when user came 2nd', () => {
      const def = makeBadgeDef({
        id: 'bd-wb',
        slug: 'wins_bronze',
        category: 'challenge',
        requirementType: 'count',
        requirementValue: 1,
      });
      const { challenges, participants } = makeCompletedChallenges(1, 2);

      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        challenges: { data: challenges, loading: false, error: null },
        participants: { data: participants, loading: false, error: null },
      });

      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });

    it('earns wins_silver at 3 wins', () => {
      const def = makeBadgeDef({
        id: 'bd-ws',
        slug: 'wins_silver',
        category: 'challenge',
        requirementType: 'count',
        requirementValue: 3,
      });
      const { challenges, participants } = makeCompletedChallenges(3, 1);

      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        challenges: { data: challenges, loading: false, error: null },
        participants: { data: participants, loading: false, error: null },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-ws');
    });

    it('tied points with top entry still counts as rank 1 (wins_bronze earned)', () => {
      const def = makeBadgeDef({
        id: 'bd-wb',
        slug: 'wins_bronze',
        category: 'challenge',
        requirementType: 'count',
        requirementValue: 1,
      });
      // user has 100, another participant also 100 → both rank 1 → user wins
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 0,
          level: 1,
          loading: false,
          error: null,
        },
        challenges: {
          data: [
            { id: 'ch1', creatorId: 'other', name: 'Done', startDate: '2024-05-01', endDate: '2024-06-10', isPublic: false, habits: [] },
          ],
          loading: false,
          error: null,
        },
        participants: {
          data: [
            makeParticipant({ id: 'p-user', totalPoints: 100 }),
            { id: 'p-other', challengeId: 'ch1', userId: 'other', totalPoints: 100, longestStreak: 0, joinDate: '2024-05-01' },
          ],
          loading: false,
          error: null,
        },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-wb');
    });
  });

  // ==================== Level badges ====================

  describe('level badges', () => {
    it('earns level badge when user level meets requirement', () => {
      const def = makeBadgeDef({
        id: 'bd-lvl3',
        slug: 'level_3',
        requirementType: 'level',
        requirementValue: 3,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 20, // level = floor(20/10) + 1 = 3
          level: 3,
          loading: false,
          error: null,
        },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-lvl3');
    });

    it('does NOT earn level badge when user level is below requirement', () => {
      const def = makeBadgeDef({
        id: 'bd-lvl3',
        slug: 'level_3',
        requirementType: 'level',
        requirementValue: 3,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [],
          totalPoints: 10, // level = floor(10/10) + 1 = 2
          level: 2,
          loading: false,
          error: null,
        },
      });

      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });
  });

  // ==================== Already earned ====================

  describe('already earned', () => {
    it('skips milestone badge if already earned', () => {
      const def = makeBadgeDef({ id: 'bd1', slug: 'first_checkin' });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [{ id: 'ub1', badgeId: 'bd1', earnedAt: '2024-06-10T00:00:00Z' }],
          totalPoints: 1,
          level: 1,
          loading: false,
          error: null,
        },
        checkins: {
          data: [{ id: 'c1', challengeId: 'ch1', userId: USER_ID, checkinDate: '2024-06-15' }],
          loading: false,
          error: null,
        },
      });

      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });

    it('skips streak badge if already earned', () => {
      const def = makeBadgeDef({
        id: 'bd-sb',
        slug: 'streak_bronze',
        category: 'streak',
        requirementType: 'streak',
        requirementValue: 7,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [{ id: 'ub1', badgeId: 'bd-sb', earnedAt: '2024-06-10T00:00:00Z' }],
          totalPoints: 1,
          level: 1,
          loading: false,
          error: null,
        },
        participants: {
          data: [makeParticipant({ longestStreak: 10 })],
          loading: false,
          error: null,
        },
      });

      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });

    it('skips podium badge if already earned (single-earn)', () => {
      const def = makeBadgeDef({
        id: 'bd-pdb',
        slug: 'podium_bronze',
        category: 'challenge',
        requirementType: 'count',
        requirementValue: 1,
      });
      const state = makeState({
        badges: {
          definitions: [def],
          earned: [{ id: 'ub1', badgeId: 'bd-pdb', earnedAt: '2024-06-10T00:00:00Z' }],
          totalPoints: 1,
          level: 1,
          loading: false,
          error: null,
        },
        challenges: {
          data: [
            { id: 'ch1', creatorId: 'other', name: 'Done', startDate: '2024-05-01', endDate: '2024-06-10', isPublic: false, habits: [] },
          ],
          loading: false,
          error: null,
        },
        participants: {
          data: [makeParticipant({ totalPoints: 100 })],
          loading: false,
          error: null,
        },
      });

      expect(evaluateNewBadges(state, USER_ID)).toEqual([]);
    });
  });

  // ==================== Level-up cascade ====================

  describe('level-up cascade', () => {
    it('awards level badge when newly earned badges push user past level threshold', () => {
      // User currently has 8 points (level 1). Earning a 5-point badge → 13 points → level 2.
      const checkinBadge = makeBadgeDef({
        id: 'bd-checkin',
        slug: 'first_checkin',
        requirementType: 'event',
        requirementValue: 1,
        points: 5,
      });
      const levelBadge = makeBadgeDef({
        id: 'bd-lvl2',
        slug: 'level_2',
        requirementType: 'level',
        requirementValue: 2,
        points: 10,
      });

      const state = makeState({
        badges: {
          definitions: [checkinBadge, levelBadge],
          earned: [],
          totalPoints: 8,
          level: 1,
          loading: false,
          error: null,
        },
        checkins: {
          data: [{ id: 'c1', challengeId: 'ch1', userId: USER_ID, checkinDate: '2024-06-15' }],
          loading: false,
          error: null,
        },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(2);
      expect(result.map(b => b.badgeId)).toContain('bd-checkin');
      expect(result.map(b => b.badgeId)).toContain('bd-lvl2');
    });

    it('does NOT cascade level badge if level threshold not reached', () => {
      const checkinBadge = makeBadgeDef({
        id: 'bd-checkin',
        slug: 'first_checkin',
        requirementType: 'event',
        requirementValue: 1,
        points: 5,
      });
      const levelBadge = makeBadgeDef({
        id: 'bd-lvl2',
        slug: 'level_2',
        requirementType: 'level',
        requirementValue: 2,
        points: 10,
      });

      const state = makeState({
        badges: {
          definitions: [checkinBadge, levelBadge],
          earned: [],
          totalPoints: 2,
          level: 1,
          loading: false,
          error: null,
        },
        checkins: {
          data: [{ id: 'c1', challengeId: 'ch1', userId: USER_ID, checkinDate: '2024-06-15' }],
          loading: false,
          error: null,
        },
      });

      const result = evaluateNewBadges(state, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].badgeId).toBe('bd-checkin');
    });
  });
});
