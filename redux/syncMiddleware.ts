import { Middleware, UnknownAction } from '@reduxjs/toolkit';
import { API_URL } from '../config/api';
import { Challenge, ChallengeParticipant, HabitCheckin, UserProfile } from '../types';
import { addToPendingSync, PendingSyncItem } from '../utils/storage';

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

// Push data to server
async function pushToServer(
  endpoint: string,
  data: unknown,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST'
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
      console.error(`[Sync] Server error ${response.status} for ${method} ${endpoint}:`, errorText);
      throw new Error(`Server error: ${response.status}`);
    }

    console.log(`[Sync] Successfully synced ${method} ${endpoint}`);
  } catch (err) {
    console.error(`[Sync] Failed to sync to ${endpoint}:`, err);
    // Queue for later sync
    const syncItem: PendingSyncItem = {
      type: endpoint.split('/')[0] as PendingSyncItem['type'],
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

const ALL_SYNC_ACTIONS = [
  ...CHALLENGE_SYNC_ACTIONS,
  ...PARTICIPANT_SYNC_ACTIONS,
  ...CHECKIN_SYNC_ACTIONS,
  ...PROFILE_SYNC_ACTIONS,
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
          await pushToServer(`challenges/${challenge.id}`, {
            challenge: {
              ...challenge,
              updated_at: new Date().toISOString(),
            },
          }, 'PUT');
        } else if (action.type === 'challenges/deleteChallenge') {
          const challengeId = action.payload as string;
          await pushToServer(`challenges/${challengeId}`, {}, 'DELETE');
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
        } else if (
          action.type === 'participants/updateParticipant' ||
          action.type === 'participants/updateParticipantStats'
        ) {
          const participant = action.payload as ChallengeParticipant;
          await pushToServer(`participants/${participant.id}`, {
            participant: {
              ...participant,
              updated_at: new Date().toISOString(),
            },
          }, 'PUT');
        } else if (action.type === 'participants/removeParticipant') {
          const participantId = action.payload as string;
          await pushToServer(`participants/${participantId}`, {}, 'DELETE');
        }

        // Checkin actions
        else if (action.type === 'checkins/addCheckin') {
          const checkin = action.payload as HabitCheckin;
          await pushToServer('checkins', {
            checkin: {
              ...checkin,
              updated_at: new Date().toISOString(),
            },
          });
        } else if (
          action.type === 'checkins/updateCheckin' ||
          action.type === 'checkins/updateHabitCompletion'
        ) {
          // For updateHabitCompletion, we need to find the full checkin
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
            await pushToServer(`checkins/${checkin.id}`, {
              checkin: {
                ...checkin,
                updated_at: new Date().toISOString(),
              },
            }, 'PUT');
          }
        } else if (action.type === 'checkins/deleteCheckin') {
          const checkinId = action.payload as string;
          await pushToServer(`checkins/${checkinId}`, {}, 'DELETE');
        }

        // Profile actions
        else if (
          action.type === 'profile/updateProfile' ||
          action.type === 'profile/updatePrivacySettings' ||
          action.type === 'profile/updateChallengeOrder'
        ) {
          const profile = state.profile.data as UserProfile;
          if (profile) {
            await pushToServer(`users/${profile.id}`, {
              profile: {
                ...profile,
                updated_at: new Date().toISOString(),
              },
            }, 'PUT');
          }
        }
      } catch (err) {
        console.error('Background sync failed:', err);
      }
    })();
  }

  return result;
};
