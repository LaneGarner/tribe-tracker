import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState, AppStateStatus } from 'react-native';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { RootState, AppDispatch } from '../redux/store';
import { addRealtimeMessage, setActiveConversation, pollNewMessages, fetchMessagesFromServer, updateMemberLastReadAt, deleteMessage, editMessage, addReaction, removeReaction } from '../redux/slices/chatSlice';
import { ChatMessage } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { isBackendConfigured } from '../config/api';
import { startAdaptivePolling } from '../utils/adaptivePolling';
import { useIsFocused } from '@react-navigation/native';

export function useConversationRealtime(conversationId: string) {
  const dispatch = useDispatch<AppDispatch>();
  const { user, session } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isFocused = useIsFocused();
  const realtimeHealthy = useRef(false);
  const refreshPolling = useRef<(() => void) | null>(null);

  // Track active conversation for unread count suppression
  useEffect(() => {
    if (!isFocused) return;
    dispatch(setActiveConversation(conversationId));
    return () => {
      dispatch(setActiveConversation(null));
    };
  }, [dispatch, conversationId, isFocused]);

  // Subscribe to messages for this conversation (realtime)
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured() || !conversationId || !isFocused) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel(`conv-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          // Skip own messages (already added optimistically)
          if (row.sender_id === user.id) return;

          const message: ChatMessage = {
            id: row.id as string,
            conversationId: row.conversation_id as string,
            senderId: row.sender_id as string,
            senderName: row.sender_name as string | undefined,
            senderPhotoUrl: row.sender_photo_url as string | undefined,
            content: row.content as string,
            type: (row.type as 'text' | 'system') || 'text',
            clientId: row.client_id as string | undefined,
            status: 'sent',
            createdAt: row.created_at as string,
          };
          dispatch(addRealtimeMessage(message));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.sender_id === user.id) return;
          const messageId = row.id as string;
          if (row.deleted_at) {
            dispatch(deleteMessage({
              conversationId,
              messageId,
              deletedAt: row.deleted_at as string,
            }));
          } else if (row.edited_at) {
            dispatch(editMessage({
              conversationId,
              messageId,
              content: row.content as string,
              editedAt: row.edited_at as string,
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.user_id === user.id) return;
          dispatch(addReaction({
            conversationId,
            messageId: row.message_id as string,
            userId: row.user_id as string,
            emoji: row.emoji as string,
            currentUserId: user.id,
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          const row = payload.old as Record<string, unknown>;
          if (!row || row.user_id === user.id) return;
          dispatch(removeReaction({
            conversationId,
            messageId: row.message_id as string,
            userId: row.user_id as string,
            emoji: row.emoji as string,
            currentUserId: user.id,
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_members',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.user_id === user.id) return;
          if (row.last_read_at) {
            dispatch(updateMemberLastReadAt({
              conversationId,
              userId: row.user_id as string,
              lastReadAt: row.last_read_at as string,
            }));
          }
        }
      )
      .subscribe((status, err) => {
        realtimeHealthy.current = status === 'SUBSCRIBED';
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') refreshPolling.current?.();
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] conv-messages-${conversationId} subscribed`);
        }
        if (err) {
          console.error(`[Realtime] conv-messages-${conversationId} error:`, err);
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, conversationId, isFocused]);

  // Polling fallback: fetch new messages every 3 seconds
  const messages = useSelector((state: RootState) => state.chat.messages[conversationId]);
  const latestTimestampRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    latestTimestampRef.current = messages?.[messages.length - 1]?.createdAt;
  }, [messages]);

  useEffect(() => {
    if (!session?.access_token || !conversationId || !isBackendConfigured() || !isFocused) return;

    let appState = AppState.currentState;

    const polling = startAdaptivePolling({
      isActive: () => appState === 'active',
      interval: () => realtimeHealthy.current ? 30000 : 3000,
      run: async () => {
        const after = latestTimestampRef.current;
        if (after) await dispatch(pollNewMessages({ token: session.access_token!, conversationId, after }));
        else await dispatch(fetchMessagesFromServer({ token: session.access_token!, conversationId }));
      },
    });
    refreshPolling.current = polling.refresh;
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      appState = s;
      if (s === 'active') void polling.refresh();
    });
    return () => {
      refreshPolling.current = null;
      polling.stop();
      sub.remove();
    };
  }, [session?.access_token, conversationId, dispatch, isFocused]);
}
