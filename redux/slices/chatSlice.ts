import { createSlice, PayloadAction, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { Conversation, ChatMessage, BlockedUser, ConversationMember, Reaction } from '../../types';
import {
  saveConversations,
  loadConversations,
  saveMessages,
  loadMessages,
  saveBlockedUsers,
  loadBlockedUsers,
} from '../../utils/storage';
import { API_URL } from '../../config/api';
import { RootState } from '../store';

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
  blockedUsers: BlockedUser[];
  loading: boolean;
  error: string | null;
  messageCursors: Record<string, string | null>;
  hasMoreMessages: Record<string, boolean>;
  activeConversationId: string | null;
}

function mergeMessage(state: ChatState, msg: ChatMessage): boolean {
  const convId = msg.conversationId;
  if (!state.messages[convId]) state.messages[convId] = [];
  const existing = state.messages[convId].find(
    m => (msg.clientId && m.clientId === msg.clientId) || m.id === msg.id
  );
  if (!existing) {
    state.messages[convId].push(msg);
    const convIndex = state.conversations.findIndex(c => c.id === convId);
    if (convIndex !== -1) {
      if (state.activeConversationId !== convId) {
        state.conversations[convIndex].unreadCount += 1;
      }
      state.conversations[convIndex].lastMessageAt = msg.createdAt;
      state.conversations[convIndex].lastMessagePreview = msg.content;
    }
    return true;
  }
  return false;
}

function findMessage(state: ChatState, conversationId: string, messageId: string): ChatMessage | undefined {
  const list = state.messages[conversationId];
  if (!list) return undefined;
  return list.find(m => m.id === messageId || m.clientId === messageId);
}

function upsertReaction(msg: ChatMessage, userId: string, emoji: string, currentUserId?: string): void {
  if (!msg.reactions) msg.reactions = [];
  let group = msg.reactions.find(r => r.emoji === emoji);
  if (!group) {
    group = { emoji, userIds: [], count: 0, selfReacted: false };
    msg.reactions.push(group);
  }
  if (!group.userIds.includes(userId)) {
    group.userIds.push(userId);
    group.count = group.userIds.length;
  }
  if (currentUserId && userId === currentUserId) group.selfReacted = true;
}

function dropReaction(msg: ChatMessage, userId: string, emoji: string, currentUserId?: string): void {
  if (!msg.reactions) return;
  const group = msg.reactions.find(r => r.emoji === emoji);
  if (!group) return;
  group.userIds = group.userIds.filter(id => id !== userId);
  group.count = group.userIds.length;
  if (currentUserId && userId === currentUserId) group.selfReacted = false;
  if (group.count === 0) {
    msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
  }
}

const initialState: ChatState = {
  conversations: [],
  messages: {},
  blockedUsers: [],
  loading: true,
  error: null,
  messageCursors: {},
  hasMoreMessages: {},
  activeConversationId: null,
};

export const loadChatFromStorage = createAsyncThunk(
  'chat/loadFromStorage',
  async () => {
    const [conversations, messages, blockedUsers] = await Promise.all([
      loadConversations(),
      loadMessages(),
      loadBlockedUsers(),
    ]);
    return { conversations, messages, blockedUsers };
  }
);

export const fetchConversationsFromServer = createAsyncThunk(
  'chat/fetchConversationsFromServer',
  async (token: string) => {
    const response = await fetch(`${API_URL}/api/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch conversations');
    const data = await response.json();
    const conversations: Conversation[] = data.conversations || [];
    await saveConversations(conversations);
    return conversations;
  }
);

export const fetchMessagesFromServer = createAsyncThunk(
  'chat/fetchMessagesFromServer',
  async ({ token, conversationId, cursor }: { token: string; conversationId: string; cursor?: string }) => {
    let url = `${API_URL}/api/messages?conversationId=${conversationId}&limit=50`;
    if (cursor) url += `&before=${cursor}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    const data = await response.json();
    return {
      conversationId,
      messages: data.messages as ChatMessage[],
      hasMore: data.hasMore as boolean,
      isLoadingMore: !!cursor,
    };
  }
);

export const pollNewMessages = createAsyncThunk(
  'chat/pollNewMessages',
  async ({ token, conversationId, after }: { token: string; conversationId: string; after: string }) => {
    const url = `${API_URL}/api/messages?conversationId=${conversationId}&after=${encodeURIComponent(after)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Poll failed');
    const data = await response.json();
    return { conversationId, messages: data.messages as ChatMessage[] };
  }
);

export const markConversationAsRead = createAsyncThunk(
  'chat/markConversationAsRead',
  async ({ token, conversationId, userId }: { token: string; conversationId: string; userId: string }, { dispatch }) => {
    const now = new Date().toISOString();
    dispatch(updateMemberLastReadAt({ conversationId, userId, lastReadAt: now }));
    dispatch(markConversationRead(conversationId));

    try {
      await fetch(`${API_URL}/api/messages`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId }),
      });
    } catch (err) {
      console.error('Mark read API error:', err);
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
      state.loading = false;
      saveConversations(action.payload);
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      const exists = state.conversations.find(c => c.id === action.payload.id);
      if (!exists) {
        state.conversations.unshift(action.payload);
        saveConversations(state.conversations);
      }
    },
    updateConversation: (state, action: PayloadAction<Partial<Conversation> & { id: string }>) => {
      const index = state.conversations.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.conversations[index] = { ...state.conversations[index], ...action.payload };
        saveConversations(state.conversations);
      }
    },
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      const msg = action.payload;
      const convId = msg.conversationId;
      if (!state.messages[convId]) state.messages[convId] = [];
      // Deduplicate by clientId or id
      const existing = state.messages[convId].find(
        m => (msg.clientId && m.clientId === msg.clientId) || m.id === msg.id
      );
      if (!existing) {
        state.messages[convId].push(msg);
      }
      // Update conversation preview
      const convIndex = state.conversations.findIndex(c => c.id === convId);
      if (convIndex !== -1) {
        state.conversations[convIndex].lastMessageAt = msg.createdAt;
        state.conversations[convIndex].lastMessagePreview = msg.content;
      }
      saveMessages(state.messages);
      saveConversations(state.conversations);
    },
    addRealtimeMessage: (state, action: PayloadAction<ChatMessage>) => {
      if (mergeMessage(state, action.payload)) {
        saveMessages(state.messages);
        saveConversations(state.conversations);
      }
    },
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },
    updateMessageStatus: (state, action: PayloadAction<{ clientId: string; status: ChatMessage['status']; id?: string }>) => {
      for (const msgs of Object.values(state.messages)) {
        const msg = msgs.find(m => m.clientId === action.payload.clientId);
        if (msg) {
          msg.status = action.payload.status;
          if (action.payload.id) msg.id = action.payload.id;
          break;
        }
      }
      saveMessages(state.messages);
    },
    setMessages: (state, action: PayloadAction<{ conversationId: string; messages: ChatMessage[] }>) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
      saveMessages(state.messages);
    },
    markConversationRead: (state, action: PayloadAction<string>) => {
      const conv = state.conversations.find(c => c.id === action.payload);
      if (conv) {
        conv.unreadCount = 0;
        saveConversations(state.conversations);
      }
    },
    addBlockedUser: (state, action: PayloadAction<BlockedUser>) => {
      state.blockedUsers.push(action.payload);
      saveBlockedUsers(state.blockedUsers);
    },
    removeBlockedUser: (state, action: PayloadAction<string>) => {
      state.blockedUsers = state.blockedUsers.filter(b => b.id !== action.payload);
      saveBlockedUsers(state.blockedUsers);
    },
    updateMemberStatus: (state, action: PayloadAction<{ conversationId: string; userId: string; status: ConversationMember['status'] }>) => {
      const conv = state.conversations.find(c => c.id === action.payload.conversationId);
      if (conv) {
        const member = conv.members.find(m => m.userId === action.payload.userId);
        if (member) {
          member.status = action.payload.status;
          saveConversations(state.conversations);
        }
      }
    },
    updateMemberLastReadAt: (state, action: PayloadAction<{ conversationId: string; userId: string; lastReadAt: string }>) => {
      const conv = state.conversations.find(c => c.id === action.payload.conversationId);
      if (conv) {
        const member = conv.members.find(m => m.userId === action.payload.userId);
        if (member) {
          member.lastReadAt = action.payload.lastReadAt;
          saveConversations(state.conversations);
        }
      }
    },
    addReaction: (state, action: PayloadAction<{ conversationId: string; messageId: string; userId: string; emoji: string; currentUserId?: string }>) => {
      const msg = findMessage(state, action.payload.conversationId, action.payload.messageId);
      if (!msg) return;
      upsertReaction(msg, action.payload.userId, action.payload.emoji, action.payload.currentUserId);
      saveMessages(state.messages);
    },
    removeReaction: (state, action: PayloadAction<{ conversationId: string; messageId: string; userId: string; emoji: string; currentUserId?: string }>) => {
      const msg = findMessage(state, action.payload.conversationId, action.payload.messageId);
      if (!msg) return;
      dropReaction(msg, action.payload.userId, action.payload.emoji, action.payload.currentUserId);
      saveMessages(state.messages);
    },
    deleteMessage: (state, action: PayloadAction<{ conversationId: string; messageId: string; deletedAt: string }>) => {
      const msg = findMessage(state, action.payload.conversationId, action.payload.messageId);
      if (!msg) return;
      msg.deletedAt = action.payload.deletedAt;
      msg.content = '';
      msg.reactions = [];
      saveMessages(state.messages);
    },
    restoreMessage: (state, action: PayloadAction<{ conversationId: string; messageId: string; content: string }>) => {
      const msg = findMessage(state, action.payload.conversationId, action.payload.messageId);
      if (!msg) return;
      msg.deletedAt = undefined;
      msg.content = action.payload.content;
      saveMessages(state.messages);
    },
    editMessage: (state, action: PayloadAction<{ conversationId: string; messageId: string; content: string; editedAt: string }>) => {
      const msg = findMessage(state, action.payload.conversationId, action.payload.messageId);
      if (!msg) return;
      msg.content = action.payload.content;
      msg.editedAt = action.payload.editedAt;
      saveMessages(state.messages);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadChatFromStorage.pending, state => { state.loading = true; })
      .addCase(loadChatFromStorage.fulfilled, (state, action) => {
        state.conversations = action.payload.conversations;
        state.messages = action.payload.messages;
        state.blockedUsers = action.payload.blockedUsers;
        state.loading = false;
      })
      .addCase(loadChatFromStorage.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to load chat data';
        state.loading = false;
      })
      .addCase(fetchConversationsFromServer.fulfilled, (state, action) => {
        state.conversations = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchConversationsFromServer.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch conversations';
        state.loading = false;
      })
      .addCase(fetchMessagesFromServer.fulfilled, (state, action) => {
        const { conversationId, messages, hasMore, isLoadingMore } = action.payload;
        // Preserve reactions / optimistic flags from existing entries
        const prevById = new Map<string, ChatMessage>();
        for (const prev of state.messages[conversationId] || []) {
          prevById.set(prev.id, prev);
          if (prev.clientId) prevById.set(prev.clientId, prev);
        }
        const reconciled = messages.map(m => {
          const prev = prevById.get(m.id) || (m.clientId ? prevById.get(m.clientId) : undefined);
          if (!prev) return m;
          return {
            ...m,
            reactions: m.reactions && m.reactions.length > 0 ? m.reactions : prev.reactions,
          };
        });
        if (isLoadingMore) {
          state.messages[conversationId] = [...reconciled, ...(state.messages[conversationId] || [])];
        } else {
          state.messages[conversationId] = reconciled;
        }
        state.hasMoreMessages[conversationId] = hasMore;
        if (reconciled.length > 0) {
          state.messageCursors[conversationId] = reconciled[0].createdAt;
        }
        saveMessages(state.messages);
      })
      .addCase(pollNewMessages.fulfilled, (state, action) => {
        let changed = false;
        for (const msg of action.payload.messages) {
          if (mergeMessage(state, msg)) changed = true;
        }
        if (changed) {
          saveMessages(state.messages);
          saveConversations(state.conversations);
        }
      });
  },
});

export const {
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
  addReaction,
  removeReaction,
  deleteMessage,
  restoreMessage,
  editMessage,
} = chatSlice.actions;

// Selectors
const selectChatState = (state: RootState) => state.chat;

export const makeSelectMessagesByConversationId = () =>
  createSelector(
    [selectChatState, (_: RootState, conversationId: string) => conversationId],
    (chat, conversationId) => chat.messages[conversationId] || []
  );

export const makeSelectConversationByChallengeId = () =>
  createSelector(
    [selectChatState, (_: RootState, challengeId: string) => challengeId],
    (chat, challengeId) => chat.conversations.find(c => c.challengeId === challengeId)
  );

export const selectTotalUnreadCount = createSelector(
  [selectChatState],
  chat => chat.conversations.reduce((sum, c) => sum + c.unreadCount, 0)
);

export const selectDmConversations = createSelector(
  [selectChatState],
  chat => chat.conversations
    .filter(c => c.type === 'dm')
    .sort((a, b) => (b.lastMessageAt || b.updatedAt || '').localeCompare(a.lastMessageAt || a.updatedAt || ''))
);

export const selectAllConversationsSorted = createSelector(
  [selectChatState],
  chat => [...chat.conversations]
    .sort((a, b) => (b.lastMessageAt || b.updatedAt || '').localeCompare(a.lastMessageAt || a.updatedAt || ''))
);

export const makeSelectReadReceiptsByConversationId = () =>
  createSelector(
    [selectChatState, (_: RootState, conversationId: string) => conversationId],
    (chat, conversationId) => {
      const conv = chat.conversations.find(c => c.id === conversationId);
      if (!conv) return [];
      return conv.members
        .filter(m => m.status === 'active' && m.lastReadAt)
        .map(m => ({
          userId: m.userId,
          userName: m.userName,
          userPhotoUrl: m.userPhotoUrl,
          lastReadAt: m.lastReadAt!,
        }));
    }
  );

export default chatSlice.reducer;
