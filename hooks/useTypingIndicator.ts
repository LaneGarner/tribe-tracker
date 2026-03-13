import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface TypingUser {
  userId: string;
  userName: string;
  userPhotoUrl?: string;
}

const THROTTLE_MS = 2000;
const EXPIRE_MS = 3000;

export function useTypingIndicator(conversationId: string) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastSentRef = useRef(0);

  // Receive typing events
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured() || !conversationId) return;

    const channel = supabase.channel(`conv-typing-${conversationId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload || payload.userId === user.id) return;

        const { userId, userName, userPhotoUrl } = payload as TypingUser;

        // Clear existing timeout for this user
        const existing = timeoutsRef.current.get(userId);
        if (existing) clearTimeout(existing);

        // Set expiry timeout
        const timeout = setTimeout(() => {
          timeoutsRef.current.delete(userId);
          setTypingUsers(prev => prev.filter(u => u.userId !== userId));
        }, EXPIRE_MS);
        timeoutsRef.current.set(userId, timeout);

        // Add/update typing user
        setTypingUsers(prev => {
          if (prev.some(u => u.userId === userId)) return prev;
          return [...prev, { userId, userName, userPhotoUrl }];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      // Clear all timeouts
      timeoutsRef.current.forEach(t => clearTimeout(t));
      timeoutsRef.current.clear();
      setTypingUsers([]);
    };
  }, [user?.id, conversationId]);

  // Send typing event (throttled)
  const sendTypingEvent = useCallback(() => {
    if (!user?.id || !channelRef.current) return;

    const now = Date.now();
    if (now - lastSentRef.current < THROTTLE_MS) return;
    lastSentRef.current = now;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        userName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        userPhotoUrl: user.user_metadata?.profile_photo_url,
      },
    });
  }, [user]);

  return { typingUsers, sendTypingEvent };
}
