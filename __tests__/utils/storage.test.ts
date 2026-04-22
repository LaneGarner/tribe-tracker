jest.mock('../../config/api', () => ({
  API_URL: 'https://test-api.vercel.app',
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveChallenges,
  loadChallenges,
  saveParticipants,
  loadParticipants,
  saveCheckins,
  loadCheckins,
  saveProfile,
  loadProfile,
  saveChallengeOrder,
  loadChallengeOrder,
  saveThemeMode,
  loadThemeMode,
  saveLastSyncTime,
  loadLastSyncTime,
  savePendingSync,
  loadPendingSync,
  addToPendingSync,
  clearPendingSync,
  saveBadgeDefinitions,
  loadBadgeDefinitions,
  saveBadges,
  loadBadges,
  saveConversations,
  loadConversations,
  saveMessages,
  loadMessages,
  saveBlockedUsers,
  loadBlockedUsers,
  clearUserData,
  clearChatData,
  clearAllAppData,
  PendingSyncItem,
} from '../../utils/storage';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

// ==================== Save / Load pairs ====================

describe('saveChallenges / loadChallenges', () => {
  it('round-trips challenge data', async () => {
    const challenges = [
      { id: 'ch1', name: 'Challenge 1', creatorId: 'u1', habits: ['Run'], startDate: '2024-06-01', isPublic: false, durationDays: 30, status: 'active' as const, participantCount: 1 },
    ];
    await saveChallenges(challenges as any);
    const result = await loadChallenges();
    expect(result).toEqual(challenges);
  });

  it('returns [] when nothing saved', async () => {
    const result = await loadChallenges();
    expect(result).toEqual([]);
  });
});

describe('saveParticipants / loadParticipants', () => {
  it('round-trips participant data', async () => {
    const participants = [
      { id: 'p1', challengeId: 'ch1', userId: 'u1', userName: 'User', totalPoints: 10, currentStreak: 1, longestStreak: 3, daysParticipated: 5, joinDate: '2024-06-01' },
    ];
    await saveParticipants(participants as any);
    const result = await loadParticipants();
    expect(result).toEqual(participants);
  });

  it('returns [] when nothing saved', async () => {
    expect(await loadParticipants()).toEqual([]);
  });
});

describe('saveCheckins / loadCheckins', () => {
  it('round-trips checkin data', async () => {
    const checkins = [
      { id: 'ck1', challengeId: 'ch1', userId: 'u1', checkinDate: '2024-06-15', habitsCompleted: [true], pointsEarned: 1, allHabitsCompleted: true },
    ];
    await saveCheckins(checkins as any);
    const result = await loadCheckins();
    expect(result).toEqual(checkins);
  });

  it('returns [] when nothing saved', async () => {
    expect(await loadCheckins()).toEqual([]);
  });
});

describe('saveProfile / loadProfile', () => {
  it('round-trips profile data', async () => {
    const profile = {
      id: 'u1', email: 'test@test.com', fullName: 'Test', hideEmail: false, hideAge: false,
      hideHeight: false, hideWeight: false, hideLocation: false, hideBio: false,
      profileVisible: true, pushNotifications: true, emailNotifications: false,
      isChildAccount: false, parentVerified: false, challengeOrder: [],
    };
    await saveProfile(profile as any);
    const result = await loadProfile();
    expect(result).toEqual(profile);
  });

  it('returns null when nothing saved', async () => {
    expect(await loadProfile()).toBeNull();
  });
});

describe('saveChallengeOrder / loadChallengeOrder', () => {
  it('round-trips challenge order', async () => {
    const order = ['ch2', 'ch1', 'ch3'];
    await saveChallengeOrder(order);
    const result = await loadChallengeOrder();
    expect(result).toEqual(order);
  });

  it('returns [] when nothing saved', async () => {
    expect(await loadChallengeOrder()).toEqual([]);
  });
});

describe('saveThemeMode / loadThemeMode', () => {
  it('round-trips theme mode as raw string', async () => {
    await saveThemeMode('dark');
    const result = await loadThemeMode();
    expect(result).toBe('dark');
  });

  it('returns "system" as default', async () => {
    expect(await loadThemeMode()).toBe('system');
  });
});

describe('saveLastSyncTime / loadLastSyncTime', () => {
  it('round-trips sync timestamp string', async () => {
    const time = '2024-06-15T12:00:00Z';
    await saveLastSyncTime(time);
    const result = await loadLastSyncTime();
    expect(result).toBe(time);
  });

  it('returns null as default', async () => {
    expect(await loadLastSyncTime()).toBeNull();
  });
});

describe('savePendingSync / loadPendingSync', () => {
  it('round-trips pending sync items', async () => {
    const items: PendingSyncItem[] = [
      { type: 'challenge', action: 'create', data: { id: 'ch1' }, timestamp: '2024-06-15T12:00:00Z' },
    ];
    await savePendingSync(items);
    const result = await loadPendingSync();
    expect(result).toEqual(items);
  });

  it('returns [] as default', async () => {
    expect(await loadPendingSync()).toEqual([]);
  });
});

describe('addToPendingSync', () => {
  it('appends to existing pending sync items', async () => {
    const item1: PendingSyncItem = { type: 'challenge', action: 'create', data: { id: 'ch1' }, timestamp: '2024-06-15T12:00:00Z' };
    const item2: PendingSyncItem = { type: 'checkin', action: 'create', data: { id: 'ck1' }, timestamp: '2024-06-15T13:00:00Z' };

    await addToPendingSync(item1);
    await addToPendingSync(item2);

    const result = await loadPendingSync();
    expect(result).toEqual([item1, item2]);
  });

  it('works when queue is initially empty', async () => {
    const item: PendingSyncItem = { type: 'profile', action: 'update', data: { name: 'New' }, timestamp: '2024-06-15T12:00:00Z' };
    await addToPendingSync(item);
    const result = await loadPendingSync();
    expect(result).toEqual([item]);
  });
});

describe('clearPendingSync', () => {
  it('empties the pending sync queue', async () => {
    const items: PendingSyncItem[] = [
      { type: 'challenge', action: 'create', data: { id: 'ch1' }, timestamp: '2024-06-15T12:00:00Z' },
    ];
    await savePendingSync(items);
    await clearPendingSync();
    const result = await loadPendingSync();
    expect(result).toEqual([]);
  });
});

describe('saveBadgeDefinitions / loadBadgeDefinitions', () => {
  it('round-trips badge definitions', async () => {
    const defs = [
      { id: 'bd1', slug: 'first_checkin', name: 'First Check-in', description: 'desc', category: 'onboarding', iconName: 'check', iconColor: '#10B981', borderColor: '#10B981', points: 5, requirementType: 'event', requirementValue: 1, sortOrder: 1 },
    ];
    await saveBadgeDefinitions(defs as any);
    const result = await loadBadgeDefinitions();
    expect(result).toEqual(defs);
  });

  it('returns [] when nothing saved', async () => {
    expect(await loadBadgeDefinitions()).toEqual([]);
  });
});

describe('saveBadges / loadBadges', () => {
  it('round-trips user badges', async () => {
    const badges = [
      { id: 'ub1', badgeId: 'bd1', earnedAt: '2024-06-15T12:00:00Z' },
    ];
    await saveBadges(badges as any);
    const result = await loadBadges();
    expect(result).toEqual(badges);
  });

  it('returns [] when nothing saved', async () => {
    expect(await loadBadges()).toEqual([]);
  });
});

describe('saveConversations / loadConversations', () => {
  it('round-trips conversations', async () => {
    const convos = [
      { id: 'conv1', type: 'group', createdBy: 'u1', unreadCount: 0, members: [] },
    ];
    await saveConversations(convos as any);
    const result = await loadConversations();
    expect(result).toEqual(convos);
  });

  it('returns [] when nothing saved', async () => {
    expect(await loadConversations()).toEqual([]);
  });
});

describe('saveMessages / loadMessages', () => {
  it('round-trips messages keyed by conversation', async () => {
    const messages = {
      conv1: [
        { id: 'm1', conversationId: 'conv1', senderId: 'u1', content: 'Hi', type: 'text', status: 'sent', createdAt: '2024-06-15T12:00:00Z' },
      ],
    };
    await saveMessages(messages as any);
    const result = await loadMessages();
    expect(result).toEqual(messages);
  });

  it('returns {} when nothing saved', async () => {
    expect(await loadMessages()).toEqual({});
  });

  it('caps messages at 100 per conversation', async () => {
    const msgs = Array.from({ length: 150 }, (_, i) => ({
      id: `m${i}`,
      conversationId: 'conv1',
      senderId: 'u1',
      content: `Message ${i}`,
      type: 'text',
      status: 'sent',
      createdAt: `2024-06-15T${String(i).padStart(2, '0')}:00:00Z`,
    }));
    await saveMessages({ conv1: msgs } as any);
    const result = await loadMessages();
    expect(result.conv1).toHaveLength(100);
    // Should keep last 100 (indices 50-149)
    expect(result.conv1[0].id).toBe('m50');
    expect(result.conv1[99].id).toBe('m149');
  });
});

describe('saveBlockedUsers / loadBlockedUsers', () => {
  it('round-trips blocked users', async () => {
    const blocked = [
      { id: 'b1', blockedId: 'u2', blockedName: 'Bad User', createdAt: '2024-06-15T12:00:00Z' },
    ];
    await saveBlockedUsers(blocked as any);
    const result = await loadBlockedUsers();
    expect(result).toEqual(blocked);
  });

  it('returns [] when nothing saved', async () => {
    expect(await loadBlockedUsers()).toEqual([]);
  });
});

// ==================== Bulk operations ====================

describe('clearUserData', () => {
  it('removes all 12 user data keys', async () => {
    // Populate various keys
    await saveChallenges([{ id: 'ch1' }] as any);
    await saveParticipants([{ id: 'p1' }] as any);
    await saveCheckins([{ id: 'ck1' }] as any);
    await saveProfile({ id: 'u1' } as any);
    await saveChallengeOrder(['ch1']);
    await saveLastSyncTime('2024-06-15T12:00:00Z');
    await savePendingSync([{ type: 'challenge', action: 'create', data: {}, timestamp: '2024-06-15T12:00:00Z' }]);
    await saveBadgeDefinitions([{ id: 'bd1' }] as any);
    await saveBadges([{ id: 'ub1' }] as any);
    await saveConversations([{ id: 'conv1' }] as any);
    await saveMessages({ conv1: [{ id: 'm1' }] } as any);
    await saveBlockedUsers([{ id: 'b1' }] as any);

    await clearUserData();

    expect(await loadChallenges()).toEqual([]);
    expect(await loadParticipants()).toEqual([]);
    expect(await loadCheckins()).toEqual([]);
    expect(await loadProfile()).toBeNull();
    expect(await loadChallengeOrder()).toEqual([]);
    expect(await loadLastSyncTime()).toBeNull();
    expect(await loadPendingSync()).toEqual([]);
    expect(await loadBadgeDefinitions()).toEqual([]);
    expect(await loadBadges()).toEqual([]);
    expect(await loadConversations()).toEqual([]);
    expect(await loadMessages()).toEqual({});
    expect(await loadBlockedUsers()).toEqual([]);
  });
});

describe('clearChatData', () => {
  beforeEach(async () => {
    await saveConversations([{ id: 'conv1' }] as any);
    await saveMessages({ conv1: [{ id: 'm1' }] } as any);
    await saveBlockedUsers([{ id: 'b1' }] as any);
  });

  it('removes conversations, messages, blocked_users locally when called with null', async () => {
    await clearChatData(null);

    expect(await loadConversations()).toEqual([]);
    expect(await loadMessages()).toEqual({});
    expect(await loadBlockedUsers()).toEqual([]);
  });

  it('does NOT call fetch when token is null', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true })) as any;

    await clearChatData(null);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('removes local data AND calls DELETE /api/conversations when token is provided', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true })) as any;

    await clearChatData('my-token');

    expect(await loadConversations()).toEqual([]);
    expect(await loadMessages()).toEqual({});
    expect(await loadBlockedUsers()).toEqual([]);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://test-api.vercel.app/api/conversations',
      {
        method: 'DELETE',
        headers: { Authorization: 'Bearer my-token' },
      },
    );
  });
});

describe('clearAllAppData', () => {
  it('clears user data plus theme mode', async () => {
    await saveChallenges([{ id: 'ch1' }] as any);
    await saveThemeMode('dark');

    await clearAllAppData();

    expect(await loadChallenges()).toEqual([]);
    expect(await loadThemeMode()).toBe('system'); // default
  });
});

// ==================== Error handling ====================

describe('error handling', () => {
  describe('getItem errors return defaults', () => {
    it('loadChallenges returns [] on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      expect(await loadChallenges()).toEqual([]);
    });

    it('loadParticipants returns [] on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      expect(await loadParticipants()).toEqual([]);
    });

    it('loadCheckins returns [] on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      expect(await loadCheckins()).toEqual([]);
    });

    it('loadProfile returns null on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      expect(await loadProfile()).toBeNull();
    });

    it('loadChallengeOrder returns [] on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      expect(await loadChallengeOrder()).toEqual([]);
    });

    it('loadThemeMode returns "system" on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      expect(await loadThemeMode()).toBe('system');
    });

    it('loadLastSyncTime returns null on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      expect(await loadLastSyncTime()).toBeNull();
    });

    it('loadPendingSync returns [] on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      expect(await loadPendingSync()).toEqual([]);
    });

    it('loadBadgeDefinitions returns [] on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      expect(await loadBadgeDefinitions()).toEqual([]);
    });

    it('loadBadges returns [] on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      expect(await loadBadges()).toEqual([]);
    });

    it('loadConversations returns [] on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      expect(await loadConversations()).toEqual([]);
    });

    it('loadMessages returns {} on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      expect(await loadMessages()).toEqual({});
    });

    it('loadBlockedUsers returns [] on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      expect(await loadBlockedUsers()).toEqual([]);
    });
  });

  describe('setItem errors do not crash', () => {
    it('saveChallenges catches error', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      await expect(saveChallenges([])).resolves.toBeUndefined();
    });

    it('saveParticipants catches error', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      await expect(saveParticipants([])).resolves.toBeUndefined();
    });

    it('saveCheckins catches error', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      await expect(saveCheckins([])).resolves.toBeUndefined();
    });

    it('saveProfile catches error', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      await expect(saveProfile({} as any)).resolves.toBeUndefined();
    });

    it('saveThemeMode catches error', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      await expect(saveThemeMode('dark')).resolves.toBeUndefined();
    });

    it('saveMessages catches error', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      await expect(saveMessages({})).resolves.toBeUndefined();
    });
  });
});
