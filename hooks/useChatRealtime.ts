import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { RootState, AppDispatch } from '../redux/store';
import { addRealtimeMessage, addConversation, updateMemberStatus } from '../redux/slices/chatSlice';
import { ChatMessage, Conversation } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { isBackendConfigured, API_URL } from '../config/api';

export function useChatRealtime() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, session } = useAuth();
  const conversations = useSelector((state: RootState) => state.chat.conversations);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const memberChannelRef = useRef<RealtimeChannel | null>(null);
  const newDmChannelRef = useRef<RealtimeChannel | null>(null);
  const conversationIdsRef = useRef<Set<string>>(new Set());

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
      .subscribe();

    return () => {
      if (newDmChannelRef.current) {
        supabase.removeChannel(newDmChannelRef.current);
        newDmChannelRef.current = null;
      }
    };
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured() || conversations.length === 0) return;

    const conversationIds = conversations.map(c => c.id);

    // Clean up previous subscriptions
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    if (memberChannelRef.current) {
      supabase.removeChannel(memberChannelRef.current);
    }

    // Subscribe to new messages
    channelRef.current = supabase
      .channel('chat-messages')
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
      .subscribe();

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
      .subscribe();

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
  }, [user?.id, conversations.length]);
}
