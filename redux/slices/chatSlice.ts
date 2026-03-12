import { createSlice, PayloadAction, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { Conversation, ChatMessage, BlockedUser, ConversationMember } from '../../types';
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
}

const initialState: ChatState = {
  conversations: [],
  messages: {},
  blockedUsers: [],
  loading: true,
  error: null,
  messageCursors: {},
  hasMoreMessages: {},
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
      const msg = action.payload;
      const convId = msg.conversationId;
      if (!state.messages[convId]) state.messages[convId] = [];
      // Skip if already exists (sender already added optimistically)
      const existing = state.messages[convId].find(
        m => (msg.clientId && m.clientId === msg.clientId) || m.id === msg.id
      );
      if (!existing) {
        state.messages[convId].push(msg);
        // Increment unread count
        const convIndex = state.conversations.findIndex(c => c.id === convId);
        if (convIndex !== -1) {
          state.conversations[convIndex].unreadCount += 1;
          state.conversations[convIndex].lastMessageAt = msg.createdAt;
          state.conversations[convIndex].lastMessagePreview = msg.content;
        }
        saveMessages(state.messages);
        saveConversations(state.conversations);
      }
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
        if (isLoadingMore) {
          // Prepend older messages
          state.messages[conversationId] = [...messages, ...(state.messages[conversationId] || [])];
        } else {
          state.messages[conversationId] = messages;
        }
        state.hasMoreMessages[conversationId] = hasMore;
        if (messages.length > 0) {
          state.messageCursors[conversationId] = messages[0].createdAt;
        }
        saveMessages(state.messages);
      });
  },
});

export const {
  setConversations,
  addConversation,
  updateConversation,
  addMessage,
  addRealtimeMessage,
  updateMessageStatus,
  setMessages,
  markConversationRead,
  addBlockedUser,
  removeBlockedUser,
  updateMemberStatus,
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

export const selectGroupConversations = createSelector(
  [selectChatState],
  chat => chat.conversations
    .filter(c => c.type === 'group')
    .sort((a, b) => (b.lastMessageAt || b.updatedAt || '').localeCompare(a.lastMessageAt || a.updatedAt || ''))
);

export const selectPendingDmRequests = createSelector(
  [selectChatState],
  chat => chat.conversations
    .filter(c => c.type === 'dm' && c.members.some(m => m.status === 'pending'))
);

export default chatSlice.reducer;
