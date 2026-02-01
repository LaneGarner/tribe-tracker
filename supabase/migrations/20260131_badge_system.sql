-- Badge System Migration
-- Run this in the Supabase SQL Editor

-- Badge definitions (static catalog)
CREATE TABLE IF NOT EXISTS badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('streak', 'volume', 'challenge', 'social', 'onboarding')),
  icon_name TEXT NOT NULL,
  icon_color TEXT NOT NULL,
  icon_color_end TEXT,
  border_color TEXT DEFAULT '#FF9500',
  points INTEGER NOT NULL DEFAULT 1 CHECK (points >= 1 AND points <= 5),
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's earned badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badge_definitions(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  challenge_id UUID REFERENCES challenges(id),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, badge_id, challenge_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_badge_definitions_category ON badge_definitions(category);

-- Add badge points to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_badge_points'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_badge_points INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'badge_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN badge_level INTEGER DEFAULT 1;
  END IF;
END $$;

-- RLS Policies
ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Badge definitions: readable by all authenticated users
DROP POLICY IF EXISTS "Badge definitions are viewable by authenticated users" ON badge_definitions;
CREATE POLICY "Badge definitions are viewable by authenticated users"
  ON badge_definitions FOR SELECT TO authenticated USING (true);

-- User badges: users can read all, only service role can insert
DROP POLICY IF EXISTS "User badges are viewable by all authenticated users" ON user_badges;
CREATE POLICY "User badges are viewable by all authenticated users"
  ON user_badges FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own badges" ON user_badges;
CREATE POLICY "Users can insert own badges"
  ON user_badges FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
