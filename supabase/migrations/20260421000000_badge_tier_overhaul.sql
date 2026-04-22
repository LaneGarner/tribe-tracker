-- ================================
-- Badge system overhaul: Bronze / Silver / Gold tiers
-- ================================
--
-- Replaces the flat badge definition set with a tiered progression:
--   Bronze = 1 point, Silver = 3 points, Gold = 7 points
--   Onboarding milestones = 1 point, single-earn
--
-- This migration wipes all existing earned badges so users re-earn
-- under the new definitions (approved behavior).
--
-- Placement badges (podium / wins) are now single-earn per tier
-- rather than per-challenge — the evaluator change enforces this
-- but wiping rows prevents stale per-challenge rows from inflating
-- counts.

BEGIN;

-- Wipe all earned badges. Users re-earn from scratch on next evaluation.
DELETE FROM user_badges;

-- Wipe all badge definitions so we can insert the new tiered set.
DELETE FROM badge_definitions;

-- ================================
-- Volume: check-ins
-- ================================
INSERT INTO badge_definitions
  (slug, name, description, category, icon_name, icon_color, border_color, points, requirement_type, requirement_value, sort_order)
VALUES
  ('checkins_bronze', 'Getting Started', 'Complete 10 check-ins',
   'volume', 'check-circle', '#CD7F32', '#CD7F32', 1, 'count', 10, 100),
  ('checkins_silver', 'Dedicated', 'Complete 50 check-ins',
   'volume', 'check-circle', '#C0C0C0', '#C0C0C0', 3, 'count', 50, 101),
  ('checkins_gold', 'Prolific', 'Complete 200 check-ins',
   'volume', 'check-circle', '#FFD700', '#FFD700', 7, 'count', 200, 102);

-- ================================
-- Streak
-- ================================
INSERT INTO badge_definitions
  (slug, name, description, category, icon_name, icon_color, border_color, points, requirement_type, requirement_value, sort_order)
VALUES
  ('streak_bronze', '7-Day Streak', 'Reach a 7-day check-in streak',
   'streak', 'flame', '#CD7F32', '#CD7F32', 1, 'streak', 7, 200),
  ('streak_silver', 'Month Strong', 'Reach a 30-day check-in streak',
   'streak', 'flame', '#C0C0C0', '#C0C0C0', 3, 'streak', 30, 201),
  ('streak_gold', 'Centurion', 'Reach a 100-day check-in streak',
   'streak', 'flame', '#FFD700', '#FFD700', 7, 'streak', 100, 202);

-- ================================
-- Challenges joined
-- ================================
INSERT INTO badge_definitions
  (slug, name, description, category, icon_name, icon_color, border_color, points, requirement_type, requirement_value, sort_order)
VALUES
  ('challenges_joined_bronze', 'Three In', 'Join 3 challenges',
   'challenge', 'users', '#CD7F32', '#CD7F32', 1, 'count', 3, 300),
  ('challenges_joined_silver', 'Serial Joiner', 'Join 10 challenges',
   'challenge', 'users', '#C0C0C0', '#C0C0C0', 3, 'count', 10, 301),
  ('challenges_joined_gold', 'Tribe Veteran', 'Join 25 challenges',
   'challenge', 'users', '#FFD700', '#FFD700', 7, 'count', 25, 302);

-- ================================
-- Challenges completed
-- ================================
INSERT INTO badge_definitions
  (slug, name, description, category, icon_name, icon_color, border_color, points, requirement_type, requirement_value, sort_order)
VALUES
  ('challenges_completed_bronze', 'Finisher', 'Complete 1 challenge',
   'challenge', 'flag', '#CD7F32', '#CD7F32', 1, 'count', 1, 310),
  ('challenges_completed_silver', 'Reliable', 'Complete 5 challenges',
   'challenge', 'flag', '#C0C0C0', '#C0C0C0', 3, 'count', 5, 311),
  ('challenges_completed_gold', 'Unstoppable', 'Complete 15 challenges',
   'challenge', 'flag', '#FFD700', '#FFD700', 7, 'count', 15, 312);

-- ================================
-- Placement: podium (top 3)
-- ================================
INSERT INTO badge_definitions
  (slug, name, description, category, icon_name, icon_color, border_color, points, requirement_type, requirement_value, sort_order)
VALUES
  ('podium_bronze', 'On the Podium', 'Finish top 3 in 1 challenge',
   'challenge', 'award', '#CD7F32', '#CD7F32', 1, 'count', 1, 320),
  ('podium_silver', 'Podium Regular', 'Finish top 3 in 5 challenges',
   'challenge', 'award', '#C0C0C0', '#C0C0C0', 3, 'count', 5, 321),
  ('podium_gold', 'Podium Legend', 'Finish top 3 in 15 challenges',
   'challenge', 'award', '#FFD700', '#FFD700', 7, 'count', 15, 322);

-- ================================
-- Placement: wins (first place)
-- ================================
INSERT INTO badge_definitions
  (slug, name, description, category, icon_name, icon_color, border_color, points, requirement_type, requirement_value, sort_order)
VALUES
  ('wins_bronze', 'First Gold', 'Win 1 challenge',
   'challenge', 'trophy', '#CD7F32', '#CD7F32', 1, 'count', 1, 330),
  ('wins_silver', 'Gold Streak', 'Win 3 challenges',
   'challenge', 'trophy', '#C0C0C0', '#C0C0C0', 3, 'count', 3, 331),
  ('wins_gold', 'Champion', 'Win 10 challenges',
   'challenge', 'trophy', '#FFD700', '#FFD700', 7, 'count', 10, 332);

-- ================================
-- Social: public challenges created
-- ================================
INSERT INTO badge_definitions
  (slug, name, description, category, icon_name, icon_color, border_color, points, requirement_type, requirement_value, sort_order)
VALUES
  ('public_bronze', 'Open Invite', 'Create 1 public challenge',
   'social', 'globe', '#CD7F32', '#CD7F32', 1, 'count', 1, 400),
  ('public_silver', 'Community Builder', 'Create 5 public challenges',
   'social', 'globe', '#C0C0C0', '#C0C0C0', 3, 'count', 5, 401),
  ('public_gold', 'Movement Leader', 'Create 15 public challenges',
   'social', 'globe', '#FFD700', '#FFD700', 7, 'count', 15, 402);

-- ================================
-- Onboarding milestones (single-earn, 1 pt each)
-- ================================
INSERT INTO badge_definitions
  (slug, name, description, category, icon_name, icon_color, border_color, points, requirement_type, requirement_value, sort_order)
VALUES
  ('first_checkin', 'First Step', 'Complete your first check-in',
   'onboarding', 'zap', '#10B981', '#10B981', 1, 'event', 1, 1),
  ('first_challenge', 'Signed Up', 'Join your first challenge',
   'onboarding', 'user-plus', '#10B981', '#10B981', 1, 'event', 1, 2),
  ('profile_complete', 'All Set', 'Fill out your full profile',
   'onboarding', 'user-check', '#10B981', '#10B981', 1, 'event', 1, 3);

COMMIT;
