import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState, AppStateStatus } from 'react-native';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { RootState, AppDispatch } from '../redux/store';
import { addRealtimeMessage, setActiveConversation, pollNewMessages } from '../redux/slices/chatSlice';
import { ChatMessage } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { isBackendConfigured } from '../config/api';

export function useConversationRealtime(conversationId: string) {
  const dispatch = useDispatch<AppDispatch>();
  const { user, session } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Track active conversation for unread count suppression
  useEffect(() => {
    dispatch(setActiveConversation(conversationId));
    return () => {
      dispatch(setActiveConversation(null));
    };
  }, [dispatch, conversationId]);

  // Subscribe to messages for this conversation (realtime)
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured() || !conversationId) return;

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
      .subscribe((status, err) => {
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
  }, [user?.id, conversationId]);

  // Polling fallback: fetch new messages every 3 seconds
  const messages = useSelector((state: RootState) => state.chat.messages[conversationId]);
  const latestTimestampRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    latestTimestampRef.current = messages?.[messages.length - 1]?.createdAt;
  }, [messages]);

  useEffect(() => {
    if (!session?.access_token || !conversationId || !isBackendConfigured()) return;

    let appState = AppState.currentState;

    const poll = () => {
      if (appState !== 'active') return;
      const after = latestTimestampRef.current;
      if (!after) return;
      dispatch(pollNewMessages({ token: session.access_token!, conversationId, after }));
    };

    const intervalId = setInterval(poll, 3000);
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => { appState = s; });

    return () => {
      clearInterval(intervalId);
      sub.remove();
    };
  }, [session?.access_token, conversationId, dispatch]);
}
