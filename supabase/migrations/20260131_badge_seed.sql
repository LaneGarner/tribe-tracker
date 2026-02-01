-- Badge Seed Data
-- Run this after the badge_system migration

-- Clear existing data (for re-runs)
DELETE FROM badge_definitions;

-- Onboarding Badges (5)
INSERT INTO badge_definitions (slug, name, description, category, icon_name, icon_color, icon_color_end, border_color, points, requirement_type, requirement_value, sort_order) VALUES
('first_checkin', 'First Step', 'Complete your first check-in', 'onboarding', 'rocket-outline', '#3B82F6', '#60A5FA', '#3B82F6', 1, 'event', 1, 1),
('getting_started', 'Getting Started', 'Complete 3 check-ins', 'onboarding', 'arrow-up-outline', '#10B981', '#34D399', '#10B981', 1, 'count', 3, 2),
('building_habit', 'Building the Habit', 'Complete 7 check-ins', 'onboarding', 'trending-up-outline', '#8B5CF6', '#A78BFA', '#8B5CF6', 2, 'count', 7, 3),
('profile_complete', 'Photogenic', 'Complete your profile', 'onboarding', 'camera-outline', '#EC4899', '#F472B6', '#EC4899', 1, 'event', NULL, 4),
('first_streak', 'Heating Up', 'Achieve a 3-day streak', 'onboarding', 'flame-outline', '#F59E0B', '#FBBF24', '#F59E0B', 2, 'streak', 3, 5);

-- Streak Badges (6)
INSERT INTO badge_definitions (slug, name, description, category, icon_name, icon_color, icon_color_end, border_color, points, requirement_type, requirement_value, sort_order) VALUES
('streak_5', 'On Fire', 'Achieve a 5-day streak', 'streak', 'flame-outline', '#F59E0B', '#FBBF24', '#FF9500', 1, 'streak', 5, 10),
('streak_10', 'Blazing', 'Achieve a 10-day streak', 'streak', 'flame', '#F97316', '#FB923C', '#FF6B00', 2, 'streak', 10, 11),
('streak_25', 'Inferno', 'Achieve a 25-day streak', 'streak', 'flash-outline', '#EF4444', '#F87171', '#EF4444', 3, 'streak', 25, 12),
('streak_50', 'Unstoppable', 'Achieve a 50-day streak', 'streak', 'shield-checkmark-outline', '#DC2626', '#EF4444', '#DC2626', 4, 'streak', 50, 13),
('streak_75', 'Legend', 'Achieve a 75-day streak', 'streak', 'trophy-outline', '#B91C1C', '#DC2626', '#B91C1C', 4, 'streak', 75, 14),
('streak_100', 'Centurion', 'Achieve a 100-day streak', 'streak', 'medal-outline', '#991B1B', '#B91C1C', '#991B1B', 5, 'streak', 100, 15);

-- Volume Badges (5)
INSERT INTO badge_definitions (slug, name, description, category, icon_name, icon_color, icon_color_end, border_color, points, requirement_type, requirement_value, sort_order) VALUES
('checkins_10', 'Double Digits', 'Complete 10 total check-ins', 'volume', 'grid-outline', '#6366F1', '#818CF8', '#6366F1', 1, 'count', 10, 20),
('checkins_25', 'Quarter Century', 'Complete 25 total check-ins', 'volume', 'calendar-outline', '#4F46E5', '#6366F1', '#4F46E5', 2, 'count', 25, 21),
('checkins_50', 'Halfway There', 'Complete 50 total check-ins', 'volume', 'flag-outline', '#4338CA', '#4F46E5', '#4338CA', 3, 'count', 50, 22),
('checkins_100', 'Century Club', 'Complete 100 total check-ins', 'volume', 'ribbon-outline', '#3730A3', '#4338CA', '#3730A3', 4, 'count', 100, 23),
('checkins_250', 'Elite', 'Complete 250 total check-ins', 'volume', 'star-outline', '#312E81', '#3730A3', '#312E81', 5, 'count', 250, 24);

-- Challenge Badges (8)
INSERT INTO badge_definitions (slug, name, description, category, icon_name, icon_color, icon_color_end, border_color, points, requirement_type, requirement_value, sort_order) VALUES
('first_challenge', 'Challenger', 'Join your first challenge', 'challenge', 'people-outline', '#14B8A6', '#2DD4BF', '#14B8A6', 1, 'event', 1, 30),
('challenge_complete', 'Finisher', 'Complete a challenge', 'challenge', 'checkmark-done-outline', '#0D9488', '#14B8A6', '#0D9488', 2, 'event', 1, 31),
('podium_gold', 'Gold Medal', 'Win 1st place in a challenge', 'challenge', 'medal-outline', '#FFD700', '#FFC107', '#FFD700', 4, 'placement', 1, 32),
('podium_silver', 'Silver Medal', 'Win 2nd place in a challenge', 'challenge', 'medal-outline', '#C0C0C0', '#A8A8A8', '#C0C0C0', 3, 'placement', 2, 33),
('podium_bronze', 'Bronze Medal', 'Win 3rd place in a challenge', 'challenge', 'medal-outline', '#CD7F32', '#B87333', '#CD7F32', 2, 'placement', 3, 34),
('challenges_5', 'Veteran', 'Complete 5 challenges', 'challenge', 'shield-checkmark-outline', '#0F766E', '#0D9488', '#0F766E', 3, 'count', 5, 35),
('wins_3', 'Triple Crown', 'Win 3 gold medals', 'challenge', 'trophy', '#115E59', '#0F766E', '#115E59', 5, 'count', 3, 36),
('challenges_10', 'Marathoner', 'Complete 10 challenges', 'challenge', 'infinite-outline', '#134E4A', '#115E59', '#134E4A', 5, 'count', 10, 37);

-- Social Badges (4)
INSERT INTO badge_definitions (slug, name, description, category, icon_name, icon_color, icon_color_end, border_color, points, requirement_type, requirement_value, sort_order) VALUES
('first_invite', 'Networker', 'Invite your first friend', 'social', 'person-add-outline', '#A855F7', '#C084FC', '#A855F7', 2, 'event', 1, 40),
('invites_5', 'Community Builder', 'Invite 5 friends', 'social', 'people-outline', '#9333EA', '#A855F7', '#9333EA', 4, 'count', 5, 41),
('create_challenge', 'Trailblazer', 'Create your first challenge', 'social', 'compass-outline', '#7C3AED', '#9333EA', '#7C3AED', 2, 'event', 1, 42),
('public_challenge', 'Open Door', 'Create a public challenge', 'social', 'globe-outline', '#6D28D9', '#7C3AED', '#6D28D9', 2, 'event', 1, 43);
