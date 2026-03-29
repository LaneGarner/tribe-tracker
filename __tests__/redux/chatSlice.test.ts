import { Conversation, ChatMessage, BlockedUser, ConversationMember } from '../../types';

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
  setConversations,
  addConversation,
  updateConversation,
  addMessage,
  addRealtimeMessage,
  setActiveConversation,
  updateMessageStatus,
  setMessages,
  markConversationRead,
  addBlockedUser,
  removeBlockedUser,
  updateMemberStatus,
  updateMemberLastReadAt,
} from '../../redux/slices/chatSlice';
import { saveConversations, saveMessages, saveBlockedUsers } from '../../utils/storage';

const makeMember = (overrides: Partial<ConversationMember> = {}): ConversationMember => ({
  id: 'mem1',
  conversationId: 'conv1',
  userId: 'u1',
  userName: 'User One',
  role: 'member',
  status: 'active',
  ...overrides,
});

const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv1',
  type: 'group',
  createdBy: 'u1',
  unreadCount: 0,
  members: [],
  ...overrides,
});

const makeMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'msg1',
  conversationId: 'conv1',
  senderId: 'u1',
  content: 'Hello',
  type: 'text',
  status: 'sent',
  createdAt: '2024-06-15T12:00:00Z',
  ...overrides,
});

describe('chatSlice', () => {
  const initialState = {
    conversations: [],
    messages: {},
    blockedUsers: [],
    loading: true,
    error: null,
    messageCursors: {},
    hasMoreMessages: {},
    activeConversationId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return the initial state', () => {
      const state = reducer(undefined, { type: 'unknown' });
      expect(state).toEqual(initialState);
    });
  });

  describe('setConversations', () => {
    it('should replace conversations and set loading=false', () => {
      const conversations = [makeConversation(), makeConversation({ id: 'conv2' })];
      const state = reducer(initialState, setConversations(conversations));

      expect(state.conversations).toEqual(conversations);
      expect(state.loading).toBe(false);
    });

    it('should call saveConversations', () => {
      const conversations = [makeConversation()];
      reducer(initialState, setConversations(conversations));
      expect(saveConversations).toHaveBeenCalledWith(conversations);
    });

    it('should handle empty array', () => {
      const prev = { ...initialState, conversations: [makeConversation()] };
      const state = reducer(prev, setConversations([]));
      expect(state.conversations).toEqual([]);
    });
  });

  describe('addConversation', () => {
    it('should prepend a new conversation', () => {
      const existing = makeConversation({ id: 'conv1' });
      const newConv = makeConversation({ id: 'conv2' });
      const prev = { ...initialState, conversations: [existing] };
      const state = reducer(prev, addConversation(newConv));

      expect(state.conversations).toHaveLength(2);
      expect(state.conversations[0].id).toBe('conv2'); // prepended
      expect(state.conversations[1].id).toBe('conv1');
    });

    it('should skip if duplicate ID exists', () => {
      const existing = makeConversation({ id: 'conv1', name: 'Original' });
      const duplicate = makeConversation({ id: 'conv1', name: 'Duplicate' });
      const prev = { ...initialState, conversations: [existing] };
      const state = reducer(prev, addConversation(duplicate));

      expect(state.conversations).toHaveLength(1);
      expect(state.conversations[0].name).toBe('Original');
    });

    it('should call saveConversations when added', () => {
      const conv = makeConversation({ id: 'conv1' });
      reducer(initialState, addConversation(conv));
      expect(saveConversations).toHaveBeenCalled();
    });

    it('should not call saveConversations when skipped as duplicate', () => {
      const existing = makeConversation({ id: 'conv1' });
      const prev = { ...initialState, conversations: [existing] };
      reducer(prev, addConversation(makeConversation({ id: 'conv1' })));
      expect(saveConversations).not.toHaveBeenCalled();
    });
  });

  describe('updateConversation', () => {
    it('should merge partial update into existing conversation', () => {
      const existing = makeConversation({ id: 'conv1', name: 'Old Name' });
      const prev = { ...initialState, conversations: [existing] };
      const state = reducer(prev, updateConversation({ id: 'conv1', name: 'New Name' }));

      expect(state.conversations[0].name).toBe('New Name');
      expect(state.conversations[0].type).toBe('group'); // unchanged
    });

    it('should be a no-op if conversation not found', () => {
      const prev = { ...initialState, conversations: [makeConversation({ id: 'conv1' })] };
      const state = reducer(prev, updateConversation({ id: 'conv999', name: 'Ghost' }));
      expect(state.conversations).toHaveLength(1);
      expect(state.conversations[0].id).toBe('conv1');
    });

    it('should call saveConversations when found', () => {
      const prev = { ...initialState, conversations: [makeConversation({ id: 'conv1' })] };
      reducer(prev, updateConversation({ id: 'conv1', name: 'Updated' }));
      expect(saveConversations).toHaveBeenCalled();
    });

    it('should not call saveConversations when not found', () => {
      const prev = { ...initialState, conversations: [makeConversation({ id: 'conv1' })] };
      reducer(prev, updateConversation({ id: 'conv999', name: 'Ghost' }));
      expect(saveConversations).not.toHaveBeenCalled();
    });
  });

  describe('addMessage', () => {
    it('should add message to correct conversation bucket', () => {
      const msg = makeMessage({ id: 'msg1', conversationId: 'conv1' });
      const state = reducer(initialState, addMessage(msg));

      expect(state.messages['conv1']).toHaveLength(1);
      expect(state.messages['conv1'][0]).toEqual(msg);
    });

    it('should initialize message array if conversation bucket does not exist', () => {
      const msg = makeMessage({ id: 'msg1', conversationId: 'conv-new' });
      const state = reducer(initialState, addMessage(msg));

      expect(state.messages['conv-new']).toBeDefined();
      expect(state.messages['conv-new']).toHaveLength(1);
    });

    it('should deduplicate by clientId', () => {
      const msg1 = makeMessage({ id: 'msg1', conversationId: 'conv1', clientId: 'client-1' });
      const msg2 = makeMessage({ id: 'msg2', conversationId: 'conv1', clientId: 'client-1' });
      let state = reducer(initialState, addMessage(msg1));
      state = reducer(state, addMessage(msg2));

      expect(state.messages['conv1']).toHaveLength(1);
    });

    it('should deduplicate by id', () => {
      const msg1 = makeMessage({ id: 'msg1', conversationId: 'conv1' });
      const msg2 = makeMessage({ id: 'msg1', conversationId: 'conv1', content: 'Updated' });
      let state = reducer(initialState, addMessage(msg1));
      state = reducer(state, addMessage(msg2));

      expect(state.messages['conv1']).toHaveLength(1);
    });

    it('should update conversation preview and lastMessageAt', () => {
      const conv = makeConversation({ id: 'conv1' });
      const prev = { ...initialState, conversations: [conv] };
      const msg = makeMessage({
        id: 'msg1',
        conversationId: 'conv1',
        content: 'New message',
        createdAt: '2024-06-15T13:00:00Z',
      });
      const state = reducer(prev, addMessage(msg));

      expect(state.conversations[0].lastMessagePreview).toBe('New message');
      expect(state.conversations[0].lastMessageAt).toBe('2024-06-15T13:00:00Z');
    });

    it('should NOT increment unreadCount (addMessage does not use mergeMessage)', () => {
      const conv = makeConversation({ id: 'conv1', unreadCount: 0 });
      const prev = { ...initialState, conversations: [conv] };
      const msg = makeMessage({ id: 'msg1', conversationId: 'conv1' });
      const state = reducer(prev, addMessage(msg));

      expect(state.conversations[0].unreadCount).toBe(0);
    });

    it('should call saveMessages and saveConversations', () => {
      const conv = makeConversation({ id: 'conv1' });
      const prev = { ...initialState, conversations: [conv] };
      reducer(prev, addMessage(makeMessage({ conversationId: 'conv1' })));

      expect(saveMessages).toHaveBeenCalled();
      expect(saveConversations).toHaveBeenCalled();
    });
  });

  describe('addRealtimeMessage', () => {
    it('should add message via mergeMessage', () => {
      const conv = makeConversation({ id: 'conv1', unreadCount: 0 });
      const prev = { ...initialState, conversations: [conv] };
      const msg = makeMessage({ id: 'msg1', conversationId: 'conv1' });
      const state = reducer(prev, addRealtimeMessage(msg));

      expect(state.messages['conv1']).toHaveLength(1);
    });

    it('should increment unreadCount when conversation is NOT active', () => {
      const conv = makeConversation({ id: 'conv1', unreadCount: 0 });
      const prev = { ...initialState, conversations: [conv], activeConversationId: null };
      const msg = makeMessage({ id: 'msg1', conversationId: 'conv1' });
      const state = reducer(prev, addRealtimeMessage(msg));

      expect(state.conversations[0].unreadCount).toBe(1);
    });

    it('should increment unreadCount when a different conversation is active', () => {
      const conv = makeConversation({ id: 'conv1', unreadCount: 2 });
      const prev = { ...initialState, conversations: [conv], activeConversationId: 'conv-other' };
      const msg = makeMessage({ id: 'msg1', conversationId: 'conv1' });
      const state = reducer(prev, addRealtimeMessage(msg));

      expect(state.conversations[0].unreadCount).toBe(3);
    });

    it('should NOT increment unreadCount when this conversation IS active', () => {
      const conv = makeConversation({ id: 'conv1', unreadCount: 0 });
      const prev = { ...initialState, conversations: [conv], activeConversationId: 'conv1' };
      const msg = makeMessage({ id: 'msg1', conversationId: 'conv1' });
      const state = reducer(prev, addRealtimeMessage(msg));

      expect(state.conversations[0].unreadCount).toBe(0);
    });

    it('should deduplicate by clientId (via mergeMessage)', () => {
      const conv = makeConversation({ id: 'conv1', unreadCount: 0 });
      const msg1 = makeMessage({ id: 'msg1', conversationId: 'conv1', clientId: 'c1' });
      const msg2 = makeMessage({ id: 'msg2', conversationId: 'conv1', clientId: 'c1' });
      let state = reducer({ ...initialState, conversations: [conv] }, addRealtimeMessage(msg1));
      state = reducer(state, addRealtimeMessage(msg2));

      expect(state.messages['conv1']).toHaveLength(1);
    });

    it('should deduplicate by id (via mergeMessage)', () => {
      const conv = makeConversation({ id: 'conv1', unreadCount: 0 });
      const msg1 = makeMessage({ id: 'msg1', conversationId: 'conv1' });
      const msg2 = makeMessage({ id: 'msg1', conversationId: 'conv1', content: 'Updated' });
      let state = reducer({ ...initialState, conversations: [conv] }, addRealtimeMessage(msg1));
      state = reducer(state, addRealtimeMessage(msg2));

      expect(state.messages['conv1']).toHaveLength(1);
    });

    it('should update lastMessageAt and lastMessagePreview', () => {
      const conv = makeConversation({ id: 'conv1' });
      const prev = { ...initialState, conversations: [conv] };
      const msg = makeMessage({ conversationId: 'conv1', content: 'Hey!', createdAt: '2024-06-16T00:00:00Z' });
      const state = reducer(prev, addRealtimeMessage(msg));

      expect(state.conversations[0].lastMessagePreview).toBe('Hey!');
      expect(state.conversations[0].lastMessageAt).toBe('2024-06-16T00:00:00Z');
    });

    it('should call saveMessages and saveConversations when new message added', () => {
      const conv = makeConversation({ id: 'conv1' });
      const prev = { ...initialState, conversations: [conv] };
      reducer(prev, addRealtimeMessage(makeMessage({ conversationId: 'conv1' })));

      expect(saveMessages).toHaveBeenCalled();
      expect(saveConversations).toHaveBeenCalled();
    });

    it('should not call save functions when message is duplicate', () => {
      const conv = makeConversation({ id: 'conv1' });
      const msg = makeMessage({ id: 'msg1', conversationId: 'conv1' });
      const prev = {
        ...initialState,
        conversations: [conv],
        messages: { conv1: [msg] },
      };
      reducer(prev, addRealtimeMessage(makeMessage({ id: 'msg1', conversationId: 'conv1' })));

      expect(saveMessages).not.toHaveBeenCalled();
      expect(saveConversations).not.toHaveBeenCalled();
    });
  });

  describe('setActiveConversation', () => {
    it('should set activeConversationId', () => {
      const state = reducer(initialState, setActiveConversation('conv1'));
      expect(state.activeConversationId).toBe('conv1');
    });

    it('should clear activeConversationId with null', () => {
      const prev = { ...initialState, activeConversationId: 'conv1' };
      const state = reducer(prev, setActiveConversation(null));
      expect(state.activeConversationId).toBeNull();
    });
  });

  describe('updateMessageStatus', () => {
    it('should find message by clientId and update status', () => {
      const msg = makeMessage({ id: 'msg1', conversationId: 'conv1', clientId: 'client-1', status: 'sending' });
      const prev = { ...initialState, messages: { conv1: [msg] } };
      const state = reducer(
        prev,
        updateMessageStatus({ clientId: 'client-1', status: 'sent' })
      );

      expect(state.messages['conv1'][0].status).toBe('sent');
    });

    it('should optionally set server id', () => {
      const msg = makeMessage({ id: 'temp-id', conversationId: 'conv1', clientId: 'client-1', status: 'sending' });
      const prev = { ...initialState, messages: { conv1: [msg] } };
      const state = reducer(
        prev,
        updateMessageStatus({ clientId: 'client-1', status: 'sent', id: 'server-id-123' })
      );

      expect(state.messages['conv1'][0].id).toBe('server-id-123');
      expect(state.messages['conv1'][0].status).toBe('sent');
    });

    it('should search across all conversation message arrays', () => {
      const msg1 = makeMessage({ id: 'msg1', conversationId: 'conv1', clientId: 'c1' });
      const msg2 = makeMessage({ id: 'msg2', conversationId: 'conv2', clientId: 'c2', status: 'sending' });
      const prev = { ...initialState, messages: { conv1: [msg1], conv2: [msg2] } };
      const state = reducer(
        prev,
        updateMessageStatus({ clientId: 'c2', status: 'sent' })
      );

      expect(state.messages['conv2'][0].status).toBe('sent');
      expect(state.messages['conv1'][0].status).toBe('sent'); // unchanged
    });

    it('should be a no-op if clientId not found', () => {
      const msg = makeMessage({ id: 'msg1', conversationId: 'conv1', clientId: 'c1', status: 'sending' });
      const prev = { ...initialState, messages: { conv1: [msg] } };
      const state = reducer(
        prev,
        updateMessageStatus({ clientId: 'c-nonexistent', status: 'failed' })
      );

      expect(state.messages['conv1'][0].status).toBe('sending');
    });

    it('should call saveMessages', () => {
      const msg = makeMessage({ conversationId: 'conv1', clientId: 'c1' });
      const prev = { ...initialState, messages: { conv1: [msg] } };
      reducer(prev, updateMessageStatus({ clientId: 'c1', status: 'sent' }));
      expect(saveMessages).toHaveBeenCalled();
    });
  });

  describe('setMessages', () => {
    it('should set messages for a specific conversation', () => {
      const messages = [makeMessage({ id: 'msg1' }), makeMessage({ id: 'msg2' })];
      const state = reducer(
        initialState,
        setMessages({ conversationId: 'conv1', messages })
      );

      expect(state.messages['conv1']).toEqual(messages);
    });

    it('should replace existing messages for a conversation', () => {
      const oldMessages = [makeMessage({ id: 'old', content: 'Old' })];
      const newMessages = [makeMessage({ id: 'new', content: 'New' })];
      const prev = { ...initialState, messages: { conv1: oldMessages } };
      const state = reducer(
        prev,
        setMessages({ conversationId: 'conv1', messages: newMessages })
      );

      expect(state.messages['conv1']).toEqual(newMessages);
    });

    it('should not affect other conversation messages', () => {
      const conv1Msgs = [makeMessage({ id: 'msg1', conversationId: 'conv1' })];
      const conv2Msgs = [makeMessage({ id: 'msg2', conversationId: 'conv2' })];
      const prev = { ...initialState, messages: { conv1: conv1Msgs } };
      const state = reducer(
        prev,
        setMessages({ conversationId: 'conv2', messages: conv2Msgs })
      );

      expect(state.messages['conv1']).toEqual(conv1Msgs);
      expect(state.messages['conv2']).toEqual(conv2Msgs);
    });

    it('should call saveMessages', () => {
      reducer(initialState, setMessages({ conversationId: 'conv1', messages: [] }));
      expect(saveMessages).toHaveBeenCalled();
    });
  });

  describe('markConversationRead', () => {
    it('should set unreadCount to 0', () => {
      const conv = makeConversation({ id: 'conv1', unreadCount: 5 });
      const prev = { ...initialState, conversations: [conv] };
      const state = reducer(prev, markConversationRead('conv1'));

      expect(state.conversations[0].unreadCount).toBe(0);
    });

    it('should be a no-op if conversation not found', () => {
      const conv = makeConversation({ id: 'conv1', unreadCount: 5 });
      const prev = { ...initialState, conversations: [conv] };
      const state = reducer(prev, markConversationRead('conv999'));

      expect(state.conversations[0].unreadCount).toBe(5);
    });

    it('should call saveConversations when conversation found', () => {
      const conv = makeConversation({ id: 'conv1', unreadCount: 3 });
      const prev = { ...initialState, conversations: [conv] };
      reducer(prev, markConversationRead('conv1'));
      expect(saveConversations).toHaveBeenCalled();
    });

    it('should not call saveConversations when conversation not found', () => {
      const prev = { ...initialState, conversations: [makeConversation({ id: 'conv1' })] };
      reducer(prev, markConversationRead('conv999'));
      expect(saveConversations).not.toHaveBeenCalled();
    });
  });

  describe('addBlockedUser', () => {
    it('should add a blocked user', () => {
      const blocked: BlockedUser = {
        id: 'b1',
        blockedId: 'u2',
        blockedName: 'Bad User',
        createdAt: '2024-06-15T00:00:00Z',
      };
      const state = reducer(initialState, addBlockedUser(blocked));

      expect(state.blockedUsers).toHaveLength(1);
      expect(state.blockedUsers[0]).toEqual(blocked);
    });

    it('should append to existing blocked users', () => {
      const existing: BlockedUser = {
        id: 'b1',
        blockedId: 'u2',
        createdAt: '2024-06-15T00:00:00Z',
      };
      const newBlocked: BlockedUser = {
        id: 'b2',
        blockedId: 'u3',
        createdAt: '2024-06-16T00:00:00Z',
      };
      const prev = { ...initialState, blockedUsers: [existing] };
      const state = reducer(prev, addBlockedUser(newBlocked));

      expect(state.blockedUsers).toHaveLength(2);
    });

    it('should call saveBlockedUsers', () => {
      const blocked: BlockedUser = {
        id: 'b1',
        blockedId: 'u2',
        createdAt: '2024-06-15T00:00:00Z',
      };
      reducer(initialState, addBlockedUser(blocked));
      expect(saveBlockedUsers).toHaveBeenCalled();
    });
  });

  describe('removeBlockedUser', () => {
    it('should remove blocked user by ID', () => {
      const b1: BlockedUser = { id: 'b1', blockedId: 'u2', createdAt: '2024-06-15T00:00:00Z' };
      const b2: BlockedUser = { id: 'b2', blockedId: 'u3', createdAt: '2024-06-16T00:00:00Z' };
      const prev = { ...initialState, blockedUsers: [b1, b2] };
      const state = reducer(prev, removeBlockedUser('b1'));

      expect(state.blockedUsers).toHaveLength(1);
      expect(state.blockedUsers[0].id).toBe('b2');
    });

    it('should be a no-op if ID not found', () => {
      const b1: BlockedUser = { id: 'b1', blockedId: 'u2', createdAt: '2024-06-15T00:00:00Z' };
      const prev = { ...initialState, blockedUsers: [b1] };
      const state = reducer(prev, removeBlockedUser('b999'));

      expect(state.blockedUsers).toHaveLength(1);
    });

    it('should call saveBlockedUsers', () => {
      const prev = { ...initialState, blockedUsers: [{ id: 'b1', blockedId: 'u2', createdAt: '2024-06-15T00:00:00Z' }] };
      reducer(prev, removeBlockedUser('b1'));
      expect(saveBlockedUsers).toHaveBeenCalled();
    });
  });

  describe('updateMemberStatus', () => {
    it('should update member status in matching conversation', () => {
      const member = makeMember({ userId: 'u1', status: 'pending' });
      const conv = makeConversation({ id: 'conv1', members: [member] });
      const prev = { ...initialState, conversations: [conv] };
      const state = reducer(
        prev,
        updateMemberStatus({ conversationId: 'conv1', userId: 'u1', status: 'active' })
      );

      expect(state.conversations[0].members[0].status).toBe('active');
    });

    it('should not affect other members', () => {
      const m1 = makeMember({ id: 'mem1', userId: 'u1', status: 'pending' });
      const m2 = makeMember({ id: 'mem2', userId: 'u2', status: 'active' });
      const conv = makeConversation({ id: 'conv1', members: [m1, m2] });
      const prev = { ...initialState, conversations: [conv] };
      const state = reducer(
        prev,
        updateMemberStatus({ conversationId: 'conv1', userId: 'u1', status: 'rejected' })
      );

      expect(state.conversations[0].members[0].status).toBe('rejected');
      expect(state.conversations[0].members[1].status).toBe('active');
    });

    it('should be a no-op if conversation not found', () => {
      const member = makeMember({ userId: 'u1', status: 'pending' });
      const conv = makeConversation({ id: 'conv1', members: [member] });
      const prev = { ...initialState, conversations: [conv] };
      const state = reducer(
        prev,
        updateMemberStatus({ conversationId: 'conv999', userId: 'u1', status: 'active' })
      );

      expect(state.conversations[0].members[0].status).toBe('pending');
    });

    it('should be a no-op if member not found', () => {
      const member = makeMember({ userId: 'u1', status: 'pending' });
      const conv = makeConversation({ id: 'conv1', members: [member] });
      const prev = { ...initialState, conversations: [conv] };
      const state = reducer(
        prev,
        updateMemberStatus({ conversationId: 'conv1', userId: 'u-ghost', status: 'active' })
      );

      expect(state.conversations[0].members[0].status).toBe('pending');
    });

    it('should call saveConversations when member found', () => {
      const member = makeMember({ userId: 'u1', status: 'pending' });
      const conv = makeConversation({ id: 'conv1', members: [member] });
      const prev = { ...initialState, conversations: [conv] };
      reducer(prev, updateMemberStatus({ conversationId: 'conv1', userId: 'u1', status: 'active' }));
      expect(saveConversations).toHaveBeenCalled();
    });

    it('should not call saveConversations when member not found', () => {
      const member = makeMember({ userId: 'u1' });
      const conv = makeConversation({ id: 'conv1', members: [member] });
      const prev = { ...initialState, conversations: [conv] };
      reducer(prev, updateMemberStatus({ conversationId: 'conv1', userId: 'u-ghost', status: 'active' }));
      expect(saveConversations).not.toHaveBeenCalled();
    });

    it('should not call saveConversations when conversation not found', () => {
      const prev = { ...initialState, conversations: [makeConversation({ id: 'conv1' })] };
      reducer(prev, updateMemberStatus({ conversationId: 'conv999', userId: 'u1', status: 'active' }));
      expect(saveConversations).not.toHaveBeenCalled();
    });
  });

  describe('updateMemberLastReadAt', () => {
    it('should update lastReadAt for matching member in conversation', () => {
      const member = makeMember({ userId: 'u1' });
      const conv = makeConversation({ id: 'conv1', members: [member] });
      const prev = { ...initialState, conversations: [conv] };
      const state = reducer(
        prev,
        updateMemberLastReadAt({
          conversationId: 'conv1',
          userId: 'u1',
          lastReadAt: '2024-06-15T15:00:00Z',
        })
      );

      expect(state.conversations[0].members[0].lastReadAt).toBe('2024-06-15T15:00:00Z');
    });

    it('should not affect other members', () => {
      const m1 = makeMember({ id: 'mem1', userId: 'u1', lastReadAt: '2024-06-14T00:00:00Z' });
      const m2 = makeMember({ id: 'mem2', userId: 'u2', lastReadAt: '2024-06-13T00:00:00Z' });
      const conv = makeConversation({ id: 'conv1', members: [m1, m2] });
      const prev = { ...initialState, conversations: [conv] };
      const state = reducer(
        prev,
        updateMemberLastReadAt({
          conversationId: 'conv1',
          userId: 'u1',
          lastReadAt: '2024-06-16T00:00:00Z',
        })
      );

      expect(state.conversations[0].members[0].lastReadAt).toBe('2024-06-16T00:00:00Z');
      expect(state.conversations[0].members[1].lastReadAt).toBe('2024-06-13T00:00:00Z');
    });

    it('should be a no-op if conversation not found', () => {
      const member = makeMember({ userId: 'u1' });
      const conv = makeConversation({ id: 'conv1', members: [member] });
      const prev = { ...initialState, conversations: [conv] };
      const state = reducer(
        prev,
        updateMemberLastReadAt({
          conversationId: 'conv999',
          userId: 'u1',
          lastReadAt: '2024-06-16T00:00:00Z',
        })
      );

      expect(state.conversations[0].members[0].lastReadAt).toBeUndefined();
    });

    it('should be a no-op if member not found', () => {
      const member = makeMember({ userId: 'u1' });
      const conv = makeConversation({ id: 'conv1', members: [member] });
      const prev = { ...initialState, conversations: [conv] };
      const state = reducer(
        prev,
        updateMemberLastReadAt({
          conversationId: 'conv1',
          userId: 'u-ghost',
          lastReadAt: '2024-06-16T00:00:00Z',
        })
      );

      expect(state.conversations[0].members[0].lastReadAt).toBeUndefined();
    });

    it('should call saveConversations when member found', () => {
      const member = makeMember({ userId: 'u1' });
      const conv = makeConversation({ id: 'conv1', members: [member] });
      const prev = { ...initialState, conversations: [conv] };
      reducer(
        prev,
        updateMemberLastReadAt({ conversationId: 'conv1', userId: 'u1', lastReadAt: '2024-06-16T00:00:00Z' })
      );
      expect(saveConversations).toHaveBeenCalled();
    });

    it('should not call saveConversations when member not found', () => {
      const member = makeMember({ userId: 'u1' });
      const conv = makeConversation({ id: 'conv1', members: [member] });
      const prev = { ...initialState, conversations: [conv] };
      reducer(
        prev,
        updateMemberLastReadAt({ conversationId: 'conv1', userId: 'u-ghost', lastReadAt: '2024-06-16T00:00:00Z' })
      );
      expect(saveConversations).not.toHaveBeenCalled();
    });

    it('should not call saveConversations when conversation not found', () => {
      const prev = { ...initialState, conversations: [makeConversation({ id: 'conv1' })] };
      reducer(
        prev,
        updateMemberLastReadAt({ conversationId: 'conv999', userId: 'u1', lastReadAt: '2024-06-16T00:00:00Z' })
      );
      expect(saveConversations).not.toHaveBeenCalled();
    });
  });
});
