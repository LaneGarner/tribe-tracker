-- Consolidated migration: all wizard/onboarding profile fields.
-- Safe to run even if individual prior migrations already applied
-- (every statement uses IF NOT EXISTS).

-- Onboarding / wizard fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goals text[] NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_specifics jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_days_per_week integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_notes text;

-- Legacy wizard signals (kept for backward compat)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS urgency text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS time_commitment text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS barriers text[] NOT NULL DEFAULT '{}';

-- Positive-framed wizard signals
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS starting_point text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS challenge_style text;

-- Current wizard habits picker
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desired_habits text[] NOT NULL DEFAULT '{}';
