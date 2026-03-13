import { useEffect, useRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState, AppStateStatus } from 'react-native';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { RootState, AppDispatch } from '../redux/store';
import { addRealtimeMessage, addConversation, updateMemberStatus, fetchConversationsFromServer } from '../redux/slices/chatSlice';
import { ChatMessage, Conversation } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { isBackendConfigured, API_URL } from '../config/api';

export function useChatListRealtime() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, session } = useAuth();
  const conversations = useSelector((state: RootState) => state.chat.conversations);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const memberChannelRef = useRef<RealtimeChannel | null>(null);
  const newDmChannelRef = useRef<RealtimeChannel | null>(null);
  const conversationIdsRef = useRef<Set<string>>(new Set());

  // Stable dependency: sorted, joined conversation IDs
  const conversationIdString = useMemo(
    () => conversations.map(c => c.id).sort().join(','),
    [conversations]
  );

  // Keep track of known conversation IDs to detect new ones
  useEffect(() => {
    conversationIdsRef.current = new Set(conversations.map(c => c.id));
  }, [conversations]);

  // Subscribe to new DM requests (conversation_members INSERTs for this user)
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) return;

    if (newDmChannelRef.current) {
      supabase.removeChannel(newDmChannelRef.current);
    }

    newDmChannelRef.current = supabase
      .channel('new-dm-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_members',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const row = payload.new as Record<string, unknown>;
          const conversationId = row.conversation_id as string;

          // Skip if we already have this conversation
          if (conversationIdsRef.current.has(conversationId)) return;

          // Fetch the full conversation from the server
          if (!session?.access_token || !isBackendConfigured()) return;
          try {
            const response = await fetch(`${API_URL}/api/conversations`, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!response.ok) return;
            const data = await response.json();
            const conv = (data.conversations as Conversation[])?.find(
              (c: Conversation) => c.id === conversationId
            );
            if (conv) {
              dispatch(addConversation(conv));
            }
          } catch (err) {
            console.error('[Realtime] Failed to fetch new conversation:', err);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] new-dm-requests subscribed');
        }
        if (err) {
          console.error('[Realtime] new-dm-requests error:', err);
        }
      });

    return () => {
      if (newDmChannelRef.current) {
        supabase.removeChannel(newDmChannelRef.current);
        newDmChannelRef.current = null;
      }
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured() || !conversationIdString) return;

    const conversationIds = conversationIdString.split(',');

    // Clean up previous subscriptions
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    if (memberChannelRef.current) {
      supabase.removeChannel(memberChannelRef.current);
    }

    // Subscribe to new messages
    channelRef.current = supabase
      .channel('chat-list-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=in.(${conversationIds.join(',')})`,
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
          console.log('[Realtime] chat-list-messages subscribed');
        }
        if (err) {
          console.error('[Realtime] chat-list-messages error:', err);
        }
      });

    // Subscribe to member status updates (DM approvals)
    memberChannelRef.current = supabase
      .channel('chat-members')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_members',
          filter: `conversation_id=in.(${conversationIds.join(',')})`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          dispatch(updateMemberStatus({
            conversationId: row.conversation_id as string,
            userId: row.user_id as string,
            status: row.status as 'active' | 'pending' | 'rejected',
          }));
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] chat-members subscribed');
        }
        if (err) {
          console.error('[Realtime] chat-members error:', err);
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (memberChannelRef.current) {
        supabase.removeChannel(memberChannelRef.current);
        memberChannelRef.current = null;
      }
    };
  }, [user?.id, conversationIdString]);

  // Polling fallback: refresh conversations every 5 seconds
  useEffect(() => {
    if (!session?.access_token || !isBackendConfigured()) return;

    let appState = AppState.currentState;

    const poll = () => {
      if (appState !== 'active') return;
      dispatch(fetchConversationsFromServer(session.access_token!));
    };

    const intervalId = setInterval(poll, 5000);
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => { appState = s; });

    return () => {
      clearInterval(intervalId);
      sub.remove();
    };
  }, [session?.access_token, dispatch]);
}
