-- Preserve the complete 1-5 record mood composition for each day.
ALTER TABLE daily_moods
  ADD COLUMN IF NOT EXISTS mood_slots JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'daily_moods_mood_slots_shape'
  ) THEN
    ALTER TABLE daily_moods
      ADD CONSTRAINT daily_moods_mood_slots_shape
      CHECK (
        jsonb_typeof(mood_slots) = 'array'
        AND jsonb_array_length(mood_slots) <= 5
      );
  END IF;
END $$;
