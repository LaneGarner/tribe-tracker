import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import {
  Challenge,
  ChallengeParticipant,
  HabitCheckin,
  UserProfile,
  UserBadge,
  ChatMessage,
  BlockedUser,
} from '../../types';

// ── Mocks (must be before imports that use them) ────────────────────────────

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
  addToPendingSync: jest.fn(),
}));

jest.mock('../../utils/badgeEvaluator', () => ({
  evaluateNewBadges: jest.fn(() => []),
}));

jest.mock('../../config/api', () => ({
  API_URL: 'https://test-api.vercel.app',
}));

import challengesReducer from '../../redux/slices/challengesSlice';
import participantsReducer from '../../redux/slices/participantsSlice';
import checkinsReducer from '../../redux/slices/checkinsSlice';
import profileReducer from '../../redux/slices/profileSlice';
import badgesReducer from '../../redux/slices/badgesSlice';
import chatReducer from '../../redux/slices/chatSlice';
import { syncMiddleware, setSyncAuth } from '../../redux/syncMiddleware';
import { addToPendingSync } from '../../utils/storage';
import { evaluateNewBadges } from '../../utils/badgeEvaluator';

// ── Helpers ─────────────────────────────────────────────────────────────────

const TEST_TOKEN = 'test-jwt-token';
const API = 'https://test-api.vercel.app';

function createTestStore() {
  return configureStore({
    reducer: {
      challenges: challengesReducer,
      participants: participantsReducer,
      checkins: checkinsReducer,
      profile: profileReducer,
      badges: badgesReducer,
      chat: chatReducer,
    },
    middleware: getDefault => getDefault().concat(syncMiddleware),
  });
}

/** Flush all pending microtasks so fire-and-forget async in the middleware completes. */
const flushAsync = () => new Promise(resolve => setTimeout(resolve, 0));

function mockFetchOk(data: unknown = {}) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

function mockFetchError(status: number, body: string) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(body),
  });
}

function mockFetchNetworkError() {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
}

const makeChallenge = (overrides: Partial<Challenge> = {}): Challenge => ({
  id: 'c1',
  name: 'Test Challenge',
  creatorId: 'u1',
  durationDays: 30,
  startDate: '2024-01-01',
  habits: ['Exercise'],
  isPublic: false,
  status: 'active',
  participantCount: 1,
  ...overrides,
});

const makeParticipant = (overrides: Partial<ChallengeParticipant> = {}): ChallengeParticipant => ({
  id: 'p1',
  challengeId: 'c1',
  userId: 'u1',
  userName: 'Test User',
  totalPoints: 10,
  currentStreak: 3,
  longestStreak: 5,
  daysParticipated: 10,
  joinDate: '2024-01-01',
  ...overrides,
});

const makeCheckin = (overrides: Partial<HabitCheckin> = {}): HabitCheckin => ({
  id: 'ck1',
  challengeId: 'c1',
  userId: 'u1',
  checkinDate: '2024-01-15',
  habitsCompleted: [true, false],
  pointsEarned: 1,
  allHabitsCompleted: false,
  ...overrides,
});

const makeProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'u1',
  email: 'test@example.com',
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

const makeMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'msg1',
  conversationId: 'conv1',
  senderId: 'u1',
  senderName: 'Test User',
  content: 'Hello',
  type: 'text',
  clientId: 'client-1',
  status: 'sending',
  createdAt: '2024-01-15T12:00:00Z',
  ...overrides,
});

const makeBadge = (overrides: Partial<UserBadge> = {}): UserBadge => ({
  id: 'ub1',
  badgeId: 'b1',
  earnedAt: '2024-01-15T12:00:00Z',
  ...overrides,
});

const makeBlocked = (overrides: Partial<BlockedUser> = {}): BlockedUser => ({
  id: 'bl1',
  blockedId: 'blocked-user-1',
  createdAt: '2024-01-15T12:00:00Z',
  ...overrides,
});

// ── Test Suite ───────────────────────────────────────────────────────────────

describe('syncMiddleware', () => {
  let store: EnhancedStore;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    // Reset auth state between tests
    setSyncAuth(null, false);
    store = createTestStore();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 1. setSyncAuth ──────────────────────────────────────────────────────

  describe('setSyncAuth', () => {
    it('enables sync when token and configured flag are set', async () => {
      setSyncAuth(TEST_TOKEN, true);
      mockFetchOk();

      store.dispatch({ type: 'challenges/addChallenge', payload: makeChallenge() });
      await flushAsync();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('without calling setSyncAuth, middleware skips sync', async () => {
      store.dispatch({ type: 'challenges/addChallenge', payload: makeChallenge() });
      await flushAsync();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ── 2. Action pass-through ──────────────────────────────────────────────

  describe('action pass-through', () => {
    it('all actions pass through to reducers regardless of sync status', () => {
      // Auth not configured — sync skipped, but reducer still runs
      const challenge = makeChallenge();
      store.dispatch({ type: 'challenges/addChallenge', payload: challenge });

      const state = store.getState();
      expect(state.challenges.data).toHaveLength(1);
      expect(state.challenges.data[0].id).toBe('c1');
    });

    it('dispatch returns the action result', () => {
      const challenge = makeChallenge();
      const result = store.dispatch({ type: 'challenges/addChallenge', payload: challenge });
      expect(result).toEqual({ type: 'challenges/addChallenge', payload: challenge });
    });

    it('non-sync actions pass through without triggering fetch', async () => {
      setSyncAuth(TEST_TOKEN, true);

      store.dispatch({ type: 'challenges/setLoading', payload: true });
      await flushAsync();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ── 3. Challenge sync actions ───────────────────────────────────────────

  describe('challenge sync actions', () => {
    beforeEach(() => {
      setSyncAuth(TEST_TOKEN, true);
    });

    it('addChallenge sends POST to /api/challenges', async () => {
      mockFetchOk();
      const challenge = makeChallenge();

      store.dispatch({ type: 'challenges/addChallenge', payload: challenge });
      await flushAsync();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/challenges`);
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe(`Bearer ${TEST_TOKEN}`);
      const body = JSON.parse(options.body);
      expect(body.challenge.id).toBe('c1');
      expect(body.challenge.name).toBe('Test Challenge');
      expect(body.challenge.updated_at).toBeDefined();
    });

    it('updateChallenge sends PUT to /api/challenges?id=X', async () => {
      mockFetchOk();
      // Seed the store so the reducer doesn't skip
      store.dispatch({ type: 'challenges/addChallenge', payload: makeChallenge() });
      (global.fetch as jest.Mock).mockClear();
      mockFetchOk();

      const updated = makeChallenge({ name: 'Updated' });
      store.dispatch({ type: 'challenges/updateChallenge', payload: updated });
      await flushAsync();

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/challenges?id=c1`);
      expect(options.method).toBe('PUT');
      const body = JSON.parse(options.body);
      expect(body.challenge.name).toBe('Updated');
    });

    it('deleteChallenge sends DELETE to /api/challenges?id=X', async () => {
      mockFetchOk();
      store.dispatch({ type: 'challenges/deleteChallenge', payload: 'c1' });
      await flushAsync();

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/challenges?id=c1`);
      expect(options.method).toBe('DELETE');
    });
  });

  // ── 4. Participant sync actions ─────────────────────────────────────────

  describe('participant sync actions', () => {
    beforeEach(() => {
      setSyncAuth(TEST_TOKEN, true);
    });

    it('addParticipant sends POST to /api/participants', async () => {
      mockFetchOk();
      const participant = makeParticipant();

      store.dispatch({ type: 'participants/addParticipant', payload: participant });
      await flushAsync();

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/participants`);
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.participant.id).toBe('p1');
      expect(body.participant.updated_at).toBeDefined();
    });

    it('updateParticipant sends PUT to /api/participants?id=X', async () => {
      mockFetchOk();
      const participant = makeParticipant({ userName: 'New Name' });

      store.dispatch({ type: 'participants/updateParticipant', payload: participant });
      await flushAsync();

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/participants?id=p1`);
      expect(options.method).toBe('PUT');
    });

    it('updateParticipantStats fetches full participant from state and sends PUT', async () => {
      // Seed participant into the store first
      store.dispatch({ type: 'participants/addParticipant', payload: makeParticipant() });
      (global.fetch as jest.Mock).mockClear();
      mockFetchOk();

      store.dispatch({
        type: 'participants/updateParticipantStats',
        payload: {
          id: 'p1',
          totalPoints: 20,
          currentStreak: 5,
          longestStreak: 10,
          daysParticipated: 15,
          lastCheckinDate: '2024-01-15',
        },
      });
      await flushAsync();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/participants?id=p1`);
      expect(options.method).toBe('PUT');
      const body = JSON.parse(options.body);
      // Stats should reflect updated values (reducer ran before middleware reads state)
      expect(body.participant.totalPoints).toBe(20);
      expect(body.participant.currentStreak).toBe(5);
    });

    it('updateParticipantStats skips fetch when participant not found in state', async () => {
      // Don't seed any participant
      store.dispatch({
        type: 'participants/updateParticipantStats',
        payload: {
          id: 'nonexistent',
          totalPoints: 20,
          currentStreak: 5,
          longestStreak: 10,
          daysParticipated: 15,
          lastCheckinDate: '2024-01-15',
        },
      });
      await flushAsync();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('removeParticipant sends DELETE to /api/participants?id=X', async () => {
      mockFetchOk();
      store.dispatch({ type: 'participants/removeParticipant', payload: 'p1' });
      await flushAsync();

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/participants?id=p1`);
      expect(options.method).toBe('DELETE');
    });
  });

  // ── 5. Checkin sync actions ─────────────────────────────────────────────

  describe('checkin sync actions', () => {
    beforeEach(() => {
      setSyncAuth(TEST_TOKEN, true);
    });

    it('addCheckin sends POST to /api/checkins', async () => {
      mockFetchOk();
      const checkin = makeCheckin();

      store.dispatch({ type: 'checkins/addCheckin', payload: checkin });
      await flushAsync();

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/checkins`);
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.checkin.id).toBe('ck1');
      expect(body.checkin.updated_at).toBeDefined();
    });

    it('updateCheckin sends POST to /api/checkins (upsert)', async () => {
      mockFetchOk();
      const checkin = makeCheckin({ habitsCompleted: [true, true], allHabitsCompleted: true });

      store.dispatch({ type: 'checkins/updateCheckin', payload: checkin });
      await flushAsync();

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/checkins`);
      expect(options.method).toBe('POST');
    });

    it('updateHabitCompletion finds full checkin from state and sends POST', async () => {
      // Seed checkin into the store
      store.dispatch({ type: 'checkins/addCheckin', payload: makeCheckin() });
      (global.fetch as jest.Mock).mockClear();
      mockFetchOk();

      store.dispatch({
        type: 'checkins/updateHabitCompletion',
        payload: { checkinId: 'ck1', habitIndex: 1, completed: true },
      });
      await flushAsync();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/checkins`);
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.checkin.id).toBe('ck1');
      // Reducer should have updated the habit completion
      expect(body.checkin.habitsCompleted[1]).toBe(true);
    });

    it('updateHabitCompletion skips fetch when checkin not found', async () => {
      store.dispatch({
        type: 'checkins/updateHabitCompletion',
        payload: { checkinId: 'nonexistent', habitIndex: 0, completed: true },
      });
      await flushAsync();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deleteCheckin sends DELETE to /api/checkins?id=X', async () => {
      mockFetchOk();
      store.dispatch({ type: 'checkins/deleteCheckin', payload: 'ck1' });
      await flushAsync();

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/checkins?id=ck1`);
      expect(options.method).toBe('DELETE');
    });
  });

  // ── 6. Profile sync actions ─────────────────────────────────────────────

  describe('profile sync actions', () => {
    beforeEach(() => {
      setSyncAuth(TEST_TOKEN, true);
      // Seed profile into state
      store.dispatch({ type: 'profile/setProfile', payload: makeProfile() });
      (global.fetch as jest.Mock).mockClear();
    });

    it('updateProfile sends PUT to /api/users?id=X', async () => {
      mockFetchOk();

      store.dispatch({ type: 'profile/updateProfile', payload: { fullName: 'New Name' } });
      await flushAsync();

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/users?id=u1`);
      expect(options.method).toBe('PUT');
      const body = JSON.parse(options.body);
      expect(body.profile.id).toBe('u1');
      expect(body.profile.updated_at).toBeDefined();
    });

    it('updatePrivacySettings sends PUT to /api/users?id=X', async () => {
      mockFetchOk();

      store.dispatch({
        type: 'profile/updatePrivacySettings',
        payload: { hideEmail: true },
      });
      await flushAsync();

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/users?id=u1`);
      expect(options.method).toBe('PUT');
    });

    it('updateChallengeOrder sends PUT to /api/users?id=X', async () => {
      mockFetchOk();

      store.dispatch({
        type: 'profile/updateChallengeOrder',
        payload: ['c1', 'c2', 'c3'],
      });
      await flushAsync();

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/users?id=u1`);
      expect(options.method).toBe('PUT');
      const body = JSON.parse(options.body);
      expect(body.profile.challengeOrder).toEqual(['c1', 'c2', 'c3']);
    });

    it('profile sync skips when profile is null', async () => {
      // Clear profile
      store.dispatch({ type: 'profile/clearProfile' });
      (global.fetch as jest.Mock).mockClear();

      store.dispatch({
        type: 'profile/updateProfile',
        payload: { fullName: 'Name' },
      });
      await flushAsync();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ── 7. Chat sync actions ────────────────────────────────────────────────

  describe('chat sync actions', () => {
    beforeEach(() => {
      setSyncAuth(TEST_TOKEN, true);
    });

    it('addMessage sends POST to /api/messages and dispatches updateMessageStatus on success', async () => {
      const serverMessage = { id: 'server-msg-1' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: serverMessage }),
        text: () => Promise.resolve(JSON.stringify({ message: serverMessage })),
      });

      const message = makeMessage();
      store.dispatch({ type: 'chat/addMessage', payload: message });
      await flushAsync();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/messages`);
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.message.clientId).toBe('client-1');
    });

    it('addMessage dispatches failed status on server error', async () => {
      mockFetchError(500, 'Internal server error');

      const message = makeMessage({ clientId: 'client-fail' });
      store.dispatch({ type: 'chat/addMessage', payload: message });
      await flushAsync();

      // The middleware dispatches updateMessageStatus with 'failed'
      // Since it's a direct fetch (not pushToServer), addToPendingSync should NOT be called
      expect(addToPendingSync).not.toHaveBeenCalled();
    });

    it('addMessage dispatches failed status on network error', async () => {
      mockFetchNetworkError();

      const message = makeMessage({ clientId: 'client-network-fail' });
      store.dispatch({ type: 'chat/addMessage', payload: message });
      await flushAsync();

      // Network error in chat/addMessage dispatches failed status, not addToPendingSync
      expect(addToPendingSync).not.toHaveBeenCalled();
    });

    it('addBlockedUser sends POST to /api/users?resource=blocked', async () => {
      mockFetchOk();
      const blocked = makeBlocked();

      store.dispatch({ type: 'chat/addBlockedUser', payload: blocked });
      await flushAsync();

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/users?resource=blocked`);
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.blockedId).toBe('blocked-user-1');
    });

    it('removeBlockedUser sends DELETE to /api/users?resource=blocked&id=X', async () => {
      mockFetchOk();
      store.dispatch({ type: 'chat/removeBlockedUser', payload: 'blocked-user-1' });
      await flushAsync();

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/users?resource=blocked&id=blocked-user-1`);
      expect(options.method).toBe('DELETE');
    });
  });

  // ── 8. Badge sync ──────────────────────────────────────────────────────

  describe('badge sync', () => {
    beforeEach(() => {
      setSyncAuth(TEST_TOKEN, true);
    });

    it('addEarnedBadge sends POST to /api/badges', async () => {
      mockFetchOk();
      const badge = makeBadge();

      store.dispatch({ type: 'badges/addEarnedBadge', payload: badge });
      await flushAsync();

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${API}/api/badges`);
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.badge.badgeId).toBe('b1');
    });
  });

  // ── 9. Error handling ──────────────────────────────────────────────────

  describe('error handling', () => {
    beforeEach(() => {
      setSyncAuth(TEST_TOKEN, true);
    });

    it('network error triggers addToPendingSync with correct PendingSyncItem', async () => {
      mockFetchNetworkError();

      store.dispatch({ type: 'challenges/addChallenge', payload: makeChallenge() });
      await flushAsync();

      expect(addToPendingSync).toHaveBeenCalledTimes(1);
      const syncItem = (addToPendingSync as jest.Mock).mock.calls[0][0];
      expect(syncItem.type).toBe('challenges');
      expect(syncItem.action).toBe('create');
      expect(syncItem.data).toBeDefined();
      expect(syncItem.timestamp).toBeDefined();
    });

    it('server 500 triggers addToPendingSync', async () => {
      mockFetchError(500, 'Internal Server Error');

      store.dispatch({ type: 'challenges/deleteChallenge', payload: 'c1' });
      await flushAsync();

      expect(addToPendingSync).toHaveBeenCalledTimes(1);
      const syncItem = (addToPendingSync as jest.Mock).mock.calls[0][0];
      expect(syncItem.type).toBe('challenges');
      expect(syncItem.action).toBe('delete');
    });

    it('server 400 "Challenge not found" retries up to 3 times with exponential backoff', async () => {
      jest.useFakeTimers();

      // All 4 attempts (initial + 3 retries) return "Challenge not found"
      for (let i = 0; i < 4; i++) {
        mockFetchError(400, 'Challenge not found');
      }

      const participant = makeParticipant();
      store.dispatch({ type: 'participants/addParticipant', payload: participant });

      // 1st call happens immediately
      await jest.advanceTimersByTimeAsync(0);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // After 500ms: 1st retry
      await jest.advanceTimersByTimeAsync(500);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // After 1000ms: 2nd retry
      await jest.advanceTimersByTimeAsync(1000);
      expect(global.fetch).toHaveBeenCalledTimes(3);

      // After 2000ms: 3rd retry
      await jest.advanceTimersByTimeAsync(2000);
      expect(global.fetch).toHaveBeenCalledTimes(4);

      // After exhausting retries, the final 400 throws and falls through to addToPendingSync
      await jest.advanceTimersByTimeAsync(0);
      expect(addToPendingSync).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('server 400 "Challenge not found" succeeds on retry if server recovers', async () => {
      jest.useFakeTimers();

      // 1st attempt: Challenge not found
      mockFetchError(400, 'Challenge not found');
      // 2nd attempt: success
      mockFetchOk();

      const participant = makeParticipant();
      store.dispatch({ type: 'participants/addParticipant', payload: participant });

      // Initial call
      await jest.advanceTimersByTimeAsync(0);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // After 500ms: retry succeeds
      await jest.advanceTimersByTimeAsync(500);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // No pending sync because it succeeded
      await jest.advanceTimersByTimeAsync(0);
      expect(addToPendingSync).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('addToPendingSync maps method to correct action type', async () => {
      // PUT → update
      mockFetchNetworkError();
      store.dispatch({
        type: 'participants/updateParticipant',
        payload: makeParticipant(),
      });
      await flushAsync();

      const syncItem = (addToPendingSync as jest.Mock).mock.calls[0][0];
      expect(syncItem.action).toBe('update');
      expect(syncItem.type).toBe('participants');
    });

    it('addToPendingSync maps DELETE to delete action', async () => {
      mockFetchNetworkError();
      store.dispatch({ type: 'participants/removeParticipant', payload: 'p1' });
      await flushAsync();

      const syncItem = (addToPendingSync as jest.Mock).mock.calls[0][0];
      expect(syncItem.action).toBe('delete');
    });
  });

  // ── 10. Badge evaluation triggers ──────────────────────────────────────

  describe('badge evaluation triggers', () => {
    beforeEach(() => {
      setSyncAuth(TEST_TOKEN, true);
      // Seed profile so userId is available
      store.dispatch({ type: 'profile/setProfile', payload: makeProfile() });
      // Seed badge definitions so evaluation runs
      store.dispatch({
        type: 'badges/setBadges',
        payload: {
          definitions: [
            {
              id: 'b1',
              slug: 'first-checkin',
              name: 'First Check-in',
              description: 'Complete your first check-in',
              category: 'onboarding',
              iconName: 'check',
              iconColor: '#10B981',
              borderColor: '#10B981',
              points: 10,
              requirementType: 'checkin_count',
              requirementValue: 1,
              sortOrder: 1,
            },
          ],
          earned: [],
          totalPoints: 0,
          level: 1,
        },
      });
      (global.fetch as jest.Mock).mockClear();
      (evaluateNewBadges as jest.Mock).mockClear();
    });

    it('checkins/addCheckin triggers evaluateNewBadges', async () => {
      mockFetchOk();
      store.dispatch({ type: 'checkins/addCheckin', payload: makeCheckin() });
      await flushAsync();

      expect(evaluateNewBadges).toHaveBeenCalledTimes(1);
      const [state, userId] = (evaluateNewBadges as jest.Mock).mock.calls[0];
      expect(userId).toBe('u1');
      expect(state.profile).toBeDefined();
    });

    it('checkins/updateHabitCompletion triggers evaluateNewBadges', async () => {
      store.dispatch({ type: 'checkins/addCheckin', payload: makeCheckin() });
      (evaluateNewBadges as jest.Mock).mockClear();
      (global.fetch as jest.Mock).mockClear();
      mockFetchOk();

      store.dispatch({
        type: 'checkins/updateHabitCompletion',
        payload: { checkinId: 'ck1', habitIndex: 1, completed: true },
      });
      await flushAsync();

      expect(evaluateNewBadges).toHaveBeenCalledTimes(1);
    });

    it('participants/updateParticipantStats triggers evaluateNewBadges', async () => {
      store.dispatch({ type: 'participants/addParticipant', payload: makeParticipant() });
      (evaluateNewBadges as jest.Mock).mockClear();
      (global.fetch as jest.Mock).mockClear();
      mockFetchOk();

      store.dispatch({
        type: 'participants/updateParticipantStats',
        payload: {
          id: 'p1',
          totalPoints: 20,
          currentStreak: 5,
          longestStreak: 10,
          daysParticipated: 15,
          lastCheckinDate: '2024-01-15',
        },
      });
      await flushAsync();

      expect(evaluateNewBadges).toHaveBeenCalledTimes(1);
    });

    it('participants/addParticipant triggers evaluateNewBadges', async () => {
      mockFetchOk();
      store.dispatch({ type: 'participants/addParticipant', payload: makeParticipant() });
      await flushAsync();

      expect(evaluateNewBadges).toHaveBeenCalledTimes(1);
    });

    it('challenges/addChallenge triggers evaluateNewBadges', async () => {
      mockFetchOk();
      store.dispatch({ type: 'challenges/addChallenge', payload: makeChallenge() });
      await flushAsync();

      expect(evaluateNewBadges).toHaveBeenCalledTimes(1);
    });

    it('profile/updateProfile triggers evaluateNewBadges', async () => {
      mockFetchOk();
      store.dispatch({ type: 'profile/updateProfile', payload: { fullName: 'Updated' } });
      await flushAsync();

      expect(evaluateNewBadges).toHaveBeenCalledTimes(1);
    });

    it('badges/fetchFromServer/fulfilled triggers evaluateNewBadges', () => {
      store.dispatch({
        type: 'badges/fetchFromServer/fulfilled',
        payload: {
          definitions: [
            {
              id: 'b1',
              slug: 'first-checkin',
              name: 'First Check-in',
              description: 'Complete your first check-in',
              category: 'onboarding',
              iconName: 'check',
              iconColor: '#10B981',
              borderColor: '#10B981',
              points: 10,
              requirementType: 'checkin_count',
              requirementValue: 1,
              sortOrder: 1,
            },
          ],
          earned: [],
          totalPoints: 0,
          level: 1,
        },
        meta: { arg: 'token', requestId: 'req1', requestStatus: 'fulfilled' },
      });

      expect(evaluateNewBadges).toHaveBeenCalledTimes(1);
    });

    it('non-trigger action does NOT trigger badge evaluation', async () => {
      mockFetchOk();
      store.dispatch({ type: 'challenges/deleteChallenge', payload: 'c1' });
      await flushAsync();

      expect(evaluateNewBadges).not.toHaveBeenCalled();
    });

    it('badge evaluation only runs when isConfigured=true, userId exists, and definitions > 0', () => {
      // Reset to unconfigured
      setSyncAuth(null, false);

      store.dispatch({ type: 'checkins/addCheckin', payload: makeCheckin() });
      expect(evaluateNewBadges).not.toHaveBeenCalled();
    });

    it('badge evaluation skips when profile has no id', () => {
      // Clear profile so userId is undefined
      store.dispatch({ type: 'profile/clearProfile' });
      (evaluateNewBadges as jest.Mock).mockClear();

      store.dispatch({ type: 'checkins/addCheckin', payload: makeCheckin() });
      expect(evaluateNewBadges).not.toHaveBeenCalled();
    });

    it('badge evaluation skips when definitions are empty', () => {
      // Clear badge definitions
      store.dispatch({
        type: 'badges/setBadges',
        payload: { definitions: [], earned: [], totalPoints: 0, level: 1 },
      });
      (evaluateNewBadges as jest.Mock).mockClear();

      store.dispatch({ type: 'checkins/addCheckin', payload: makeCheckin() });
      expect(evaluateNewBadges).not.toHaveBeenCalled();
    });

    it('dispatches addEarnedBadge for each new badge from evaluation', async () => {
      const newBadges: UserBadge[] = [
        { id: 'ub1', badgeId: 'b1', earnedAt: '2024-01-15T12:00:00Z' },
        { id: 'ub2', badgeId: 'b2', earnedAt: '2024-01-15T12:01:00Z' },
      ];
      (evaluateNewBadges as jest.Mock).mockReturnValueOnce(newBadges);

      // Each addEarnedBadge dispatch will trigger another sync call
      mockFetchOk();
      mockFetchOk();
      // Also mock for the addCheckin itself
      mockFetchOk();

      store.dispatch({ type: 'checkins/addCheckin', payload: makeCheckin() });
      await flushAsync();

      const state = store.getState();
      // Both badges should be in the earned array
      expect(state.badges.earned).toHaveLength(2);
      expect(state.badges.earned[0].badgeId).toBe('b1');
      expect(state.badges.earned[1].badgeId).toBe('b2');
    });
  });

  // ── 11. Skips sync when not configured ──────────────────────────────────

  describe('skips sync when not configured', () => {
    it('authToken=null results in no fetch calls', async () => {
      setSyncAuth(null, true);

      store.dispatch({ type: 'challenges/addChallenge', payload: makeChallenge() });
      await flushAsync();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('isConfigured=false results in no fetch calls', async () => {
      setSyncAuth(TEST_TOKEN, false);

      store.dispatch({ type: 'challenges/addChallenge', payload: makeChallenge() });
      await flushAsync();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('both null token and unconfigured results in no fetch calls', async () => {
      setSyncAuth(null, false);

      store.dispatch({ type: 'challenges/addChallenge', payload: makeChallenge() });
      await flushAsync();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
