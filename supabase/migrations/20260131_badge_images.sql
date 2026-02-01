-- Add image_url column to badge_definitions
-- Run this in the Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'badge_definitions' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE badge_definitions ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- Add index for badges that have images (for potential filtering)
CREATE INDEX IF NOT EXISTS idx_badge_definitions_has_image
  ON badge_definitions((image_url IS NOT NULL));
