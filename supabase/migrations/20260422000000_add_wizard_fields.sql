ALTER TABLE profiles ADD COLUMN IF NOT EXISTS urgency text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS time_commitment text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS barriers text[] NOT NULL DEFAULT '{}';
