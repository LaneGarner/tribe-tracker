ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desired_habits text[] NOT NULL DEFAULT '{}';
