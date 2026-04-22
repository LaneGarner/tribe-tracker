import { Middleware, UnknownAction } from '@reduxjs/toolkit';
import { API_URL } from '../config/api';
import { Challenge, ChallengeParticipant, HabitCheckin, UserProfile, UserBadge, ChatMessage, BlockedUser } from '../types';
import { addToPendingSync, clearCoachInsights, PendingSyncItem } from '../utils/storage';
import { evaluateNewBadges } from '../utils/badgeEvaluator';
import { addEarnedBadge } from './slices/badgesSlice';

// Type guard for actions with payload
interface ActionWithPayload<T = unknown> extends UnknownAction {
  payload: T;
}

// Auth token storage - set from AuthContext
let authToken: string | null = null;
let isConfigured = false;

export function setSyncAuth(token: string | null, configured: boolean) {
  authToken = token;
  isConfigured = configured;
}

// Delay helper for retry logic
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Push data to server with retry support for foreign key violations
async function pushToServer(
  endpoint: string,
  data: unknown,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST',
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<void> {
  if (!API_URL) {
    console.warn('[Sync] API_URL not configured, skipping sync');
    return;
  }
  if (!authToken) {
    console.warn('[Sync] No auth token, skipping sync');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Check for foreign key violation (challenge not found) - retry with backoff
      if (response.status === 400 && errorText.includes('Challenge not found') && retryCount < maxRetries) {
        const retryDelay = Math.pow(2, retryCount) * 500; // 500ms, 1s, 2s
        console.log(`[Sync] Challenge not found, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await delay(retryDelay);
        return pushToServer(endpoint, data, method, retryCount + 1, maxRetries);
      }

      console.error(`[Sync] Server error ${response.status} for ${method} ${endpoint}:`, errorText);
      throw new Error(`Server error: ${response.status}`);
    }

    console.log(`[Sync] Successfully synced ${method} ${endpoint}`);
  } catch (err) {
    console.error(`[Sync] Failed to sync to ${endpoint}:`, err);
    // Queue for later sync
    const syncItem: PendingSyncItem = {
      type: endpoint.split('?')[0].split('/')[0] as PendingSyncItem['type'],
      action: method === 'DELETE' ? 'delete' : method === 'PUT' ? 'update' : 'create',
      data,
      timestamp: new Date().toISOString(),
    };
    await addToPendingSync(syncItem);
  }
}

// Challenge action types to sync
const CHALLENGE_SYNC_ACTIONS = [
  'challenges/addChallenge',
  'challenges/updateChallenge',
  'challenges/deleteChallenge',
];

// Participant action types to sync
const PARTICIPANT_SYNC_ACTIONS = [
  'participants/addParticipant',
  'participants/updateParticipant',
  'participants/removeParticipant',
  'participants/updateParticipantStats',
];

// Checkin action types to sync
const CHECKIN_SYNC_ACTIONS = [
  'checkins/addCheckin',
  'checkins/updateCheckin',
  'checkins/updateHabitCompletion',
  'checkins/deleteCheckin',
];

// Profile action types to sync
const PROFILE_SYNC_ACTIONS = [
  'profile/updateProfile',
  'profile/updatePrivacySettings',
  'profile/updateChallengeOrder',
];

// Chat action types to sync
const CHAT_SYNC_ACTIONS = [
  'chat/addMessage',
  'chat/addBlockedUser',
  'chat/removeBlockedUser',
  'chat/addReaction',
  'chat/removeReaction',
  'chat/deleteMessage',
  'chat/editMessage',
];

// Badge action types to sync
const BADGE_SYNC_ACTIONS = [
  'badges/addEarnedBadge',
];

// Actions that should trigger badge evaluation
const BADGE_TRIGGER_ACTIONS = [
  'checkins/addCheckin',
  'checkins/updateHabitCompletion',
  'participants/updateParticipantStats',
  'participants/addParticipant',
  'challenges/addChallenge',
  'profile/updateProfile',
  'badges/fetchFromServer/fulfilled',
];

const ALL_SYNC_ACTIONS = [
  ...CHALLENGE_SYNC_ACTIONS,
  ...PARTICIPANT_SYNC_ACTIONS,
  ...CHECKIN_SYNC_ACTIONS,
  ...PROFILE_SYNC_ACTIONS,
  ...CHAT_SYNC_ACTIONS,
  ...BADGE_SYNC_ACTIONS,
];

export const syncMiddleware: Middleware = store => next => unknownAction => {
  // Always let the action pass through first (local update)
  const result = next(unknownAction);
  const action = unknownAction as ActionWithPayload;

  // Then sync in background if authenticated
  if (ALL_SYNC_ACTIONS.includes(action.type) && authToken && isConfigured) {
    const state = store.getState();

    // Fire and forget - don't block the UI
    (async () => {
      try {
        // Challenge actions
        if (action.type === 'challenges/addChallenge') {
          const challenge = action.payload as Challenge;
          await pushToServer('challenges', {
            challenge: {
              ...challenge,
              updated_at: new Date().toISOString(),
            },
          });
        } else if (action.type === 'challenges/updateChallenge') {
          const challenge = action.payload as Challenge;
          await pushToServer(`challenges?id=${challenge.id}`, {
            challenge: {
              ...challenge,
              updated_at: new Date().toISOString(),
            },
          }, 'PUT');
        } else if (action.type === 'challenges/deleteChallenge') {
          const challengeId = action.payload as string;
          await pushToServer(`challenges?id=${challengeId}`, {}, 'DELETE');
        }

        // Participant actions
        else if (action.type === 'participants/addParticipant') {
          const participant = action.payload as ChallengeParticipant;
          await pushToServer('participants', {
            participant: {
              ...participant,
              updated_at: new Date().toISOString(),
            },
          });
        } else if (action.type === 'participants/updateParticipant') {
          const participant = action.payload as ChallengeParticipant;
          await pushToServer(`participants?id=${participant.id}`, {
            participant: {
              ...participant,
              updated_at: new Date().toISOString(),
            },
          }, 'PUT');
        } else if (action.type === 'participants/updateParticipantStats') {
          // updateParticipantStats payload is just stats, not full participant
          // Get the full participant from state after the reducer updated it
          const { id } = action.payload as { id: string };
          const participant = state.participants.data.find(
            (p: ChallengeParticipant) => p.id === id
          );
          console.log('[Sync] updateParticipantStats - payload:', action.payload);
          console.log('[Sync] updateParticipantStats - found participant:', participant);
          if (participant) {
            console.log('[Sync] Sending participant stats to server:', {
              id,
              totalPoints: participant.totalPoints,
              currentStreak: participant.currentStreak,
            });
            await pushToServer(`participants?id=${id}`, {
              participant: {
                ...participant,
                updated_at: new Date().toISOString(),
              },
            }, 'PUT');
          } else {
            console.warn('[Sync] Could not find participant with id:', id);
          }
        } else if (action.type === 'participants/removeParticipant') {
          const participantId = action.payload as string;
          await pushToServer(`participants?id=${participantId}`, {}, 'DELETE');
        }

        // Checkin actions - all use POST with upsert logic since backend doesn't have PUT
        else if (
          action.type === 'checkins/addCheckin' ||
          action.type === 'checkins/updateCheckin' ||
          action.type === 'checkins/updateHabitCompletion'
        ) {
          let checkin: HabitCheckin | undefined;
          if (action.type === 'checkins/updateHabitCompletion') {
            const { checkinId } = action.payload as { checkinId: string };
            checkin = state.checkins.data.find(
              (c: HabitCheckin) => c.id === checkinId
            );
          } else {
            checkin = action.payload as HabitCheckin;
          }
          if (checkin) {
            await pushToServer('checkins', {
              checkin: {
                ...checkin,
                updated_at: new Date().toISOString(),
              },
            });
          }
        } else if (action.type === 'checkins/deleteCheckin') {
          const checkinId = action.payload as string;
          await pushToServer(`checkins?id=${checkinId}`, {}, 'DELETE');
        }

        // Profile actions
        else if (
          action.type === 'profile/updateProfile' ||
          action.type === 'profile/updatePrivacySettings' ||
          action.type === 'profile/updateChallengeOrder'
        ) {
          const profile = state.profile.data as UserProfile;
          if (profile) {
            await pushToServer(`users?id=${profile.id}`, {
              profile: {
                ...profile,
                updated_at: new Date().toISOString(),
              },
            }, 'PUT');
          }
        }

        // Chat actions
        else if (action.type === 'chat/addMessage') {
          const message = action.payload as ChatMessage;
          try {
            const response = await fetch(`${API_URL}/api/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify({ message }),
            });
            if (response.ok) {
              const data = await response.json();
              // Update message status to sent
              store.dispatch({
                type: 'chat/updateMessageStatus',
                payload: { clientId: message.clientId, status: 'sent', id: data.message?.id },
              });
            } else {
              const errorText = await response.text();
              console.error(`[Sync] Message send failed (${response.status}):`, errorText);
              store.dispatch({
                type: 'chat/updateMessageStatus',
                payload: { clientId: message.clientId, status: 'failed' },
              });
            }
          } catch {
            store.dispatch({
              type: 'chat/updateMessageStatus',
              payload: { clientId: message.clientId, status: 'failed' },
            });
          }
        } else if (action.type === 'chat/addBlockedUser') {
          const blocked = action.payload as BlockedUser;
          await pushToServer('users?resource=blocked', { blockedId: blocked.blockedId });
        } else if (action.type === 'chat/removeBlockedUser') {
          const blockedId = action.payload as string;
          await pushToServer(`users?resource=blocked&id=${blockedId}`, {}, 'DELETE');
        } else if (action.type === 'chat/addReaction') {
          const { conversationId, messageId, userId, emoji, currentUserId } = action.payload as {
            conversationId: string; messageId: string; userId: string; emoji: string; currentUserId?: string;
          };
          try {
            const response = await fetch(`${API_URL}/api/message-reactions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
              body: JSON.stringify({ messageId, emoji }),
            });
            // 409 = UNIQUE violation (already exists) — treat as success for offline replay
            if (!response.ok && response.status !== 409) {
              console.error(`[Sync] addReaction failed (${response.status})`);
              store.dispatch({
                type: 'chat/removeReaction',
                payload: { conversationId, messageId, userId, emoji, currentUserId },
              });
            }
          } catch (err) {
            console.error('[Sync] addReaction network error:', err);
          }
        } else if (action.type === 'chat/removeReaction') {
          const { conversationId, messageId, userId, emoji, currentUserId } = action.payload as {
            conversationId: string; messageId: string; userId: string; emoji: string; currentUserId?: string;
          };
          try {
            const response = await fetch(
              `${API_URL}/api/message-reactions?messageId=${messageId}&emoji=${encodeURIComponent(emoji)}`,
              { method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` } }
            );
            if (!response.ok && response.status !== 404) {
              console.error(`[Sync] removeReaction failed (${response.status})`);
              store.dispatch({
                type: 'chat/addReaction',
                payload: { conversationId, messageId, userId, emoji, currentUserId },
              });
            }
          } catch (err) {
            console.error('[Sync] removeReaction network error:', err);
          }
        } else if (action.type === 'chat/deleteMessage') {
          const { messageId } = action.payload as { conversationId: string; messageId: string; deletedAt: string };
          try {
            const response = await fetch(`${API_URL}/api/messages?id=${messageId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${authToken}` },
            });
            if (!response.ok) {
              console.error(`[Sync] deleteMessage failed (${response.status})`);
            }
          } catch (err) {
            console.error('[Sync] deleteMessage network error:', err);
          }
        } else if (action.type === 'chat/editMessage') {
          const { messageId, content } = action.payload as {
            conversationId: string; messageId: string; content: string; editedAt: string; previousContent?: string;
          };
          try {
            const response = await fetch(`${API_URL}/api/messages?id=${messageId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
              body: JSON.stringify({ content }),
            });
            if (!response.ok) {
              console.error(`[Sync] editMessage failed (${response.status})`);
            }
          } catch (err) {
            console.error('[Sync] editMessage network error:', err);
          }
        }

        // Badge sync
        else if (action.type === 'badges/addEarnedBadge') {
          const badge = action.payload as UserBadge;
          await pushToServer('badges', { badge });
        }
      } catch (err) {
        console.error('Background sync failed:', err);
      }
    })();
  }

  // Invalidate cached AI coach insights whenever check-in data changes so stale
  // summaries don't linger. Fire-and-forget; the screen falls back to a fresh fetch.
  if (CHECKIN_SYNC_ACTIONS.includes(action.type)) {
    clearCoachInsights().catch(() => {});
  }

  // Badge evaluation — runs after relevant actions (including non-sync actions like fetchFromServer/fulfilled)
  if (BADGE_TRIGGER_ACTIONS.includes(action.type) && isConfigured) {
    const currentState = store.getState();
    const userId = currentState.profile.data?.id;
    if (userId && currentState.badges.definitions.length > 0) {
      try {
        const newBadges = evaluateNewBadges(currentState, userId);
        for (const badge of newBadges) {
          store.dispatch(addEarnedBadge(badge));
        }
        if (newBadges.length > 0) {
          console.log(`[Badges] Awarded ${newBadges.length} new badge(s)`);
        }
      } catch (err) {
        console.error('[Badges] Evaluation failed:', err);
      }
    }
  }

  return result;
};
