-- Add reply, soft-delete, and edit support to messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;

-- Message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_message_user_emoji UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

ALTER TABLE message_reactions REPLICA IDENTITY FULL;

-- Allow senders to update/delete their own messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own messages" ON messages;
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Message reactions RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view reactions in their conversations" ON message_reactions
  FOR SELECT USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE cm.user_id = auth.uid() AND cm.status = 'active'
    )
  );

CREATE POLICY "Members can add their own reactions" ON message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE cm.user_id = auth.uid() AND cm.status = 'active'
    )
  );

CREATE POLICY "Users can remove their own reactions" ON message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
