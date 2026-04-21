-- Add onboarding/goal fields to profiles so the first-run wizard can persist
-- the user's self-reported goals and know when it has been completed.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS goals text[] NOT NULL DEFAULT '{}';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS goal_specifics jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS goal_days_per_week integer;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS goal_notes text;
