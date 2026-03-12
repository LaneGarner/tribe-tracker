import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { RootState, AppDispatch } from '../redux/store';
import { addRealtimeMessage, updateMemberStatus } from '../redux/slices/chatSlice';
import { ChatMessage } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useChatRealtime() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  const conversations = useSelector((state: RootState) => state.chat.conversations);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const memberChannelRef = useRef<RealtimeChannel | null>(null);

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
