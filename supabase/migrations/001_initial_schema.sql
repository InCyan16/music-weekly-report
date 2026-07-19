-- Music Diary Database Schema
-- Run via Supabase CLI or SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. profiles
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. music_connections (tokens stored server-side only)
-- ============================================
CREATE TABLE IF NOT EXISTS music_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT,
  connection_status TEXT NOT NULL DEFAULT 'disconnected',
  -- Encrypted tokens - only accessible via service role
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- ============================================
-- 3. songs
-- ============================================
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  cover_url TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  playable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source, external_id)
);

-- ============================================
-- 4. playback_sessions
-- ============================================
CREATE TABLE IF NOT EXISTS playback_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_session_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  local_date DATE NOT NULL,
  week_start DATE NOT NULL,
  actual_played_ms INTEGER NOT NULL DEFAULT 0,
  last_position_ms INTEGER NOT NULL DEFAULT 0,
  valid_play_threshold_ms INTEGER NOT NULL DEFAULT 30000,
  qualified_at TIMESTAMPTZ,
  is_qualified BOOLEAN NOT NULL DEFAULT false,
  end_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, client_session_id)
);

CREATE INDEX IF NOT EXISTS idx_playback_sessions_user_date
  ON playback_sessions(user_id, local_date);
CREATE INDEX IF NOT EXISTS idx_playback_sessions_user_week
  ON playback_sessions(user_id, week_start);

-- ============================================
-- 5. listening_entries (valid plays only)
-- ============================================
CREATE TABLE IF NOT EXISTS listening_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playback_session_id UUID NOT NULL REFERENCES playback_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  listened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  local_date DATE NOT NULL,
  week_start DATE NOT NULL,
  actual_played_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(playback_session_id)
);

CREATE INDEX IF NOT EXISTS idx_listening_entries_user_week
  ON listening_entries(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_listening_entries_user_date
  ON listening_entries(user_id, local_date);

-- ============================================
-- 6. daily_moods
-- ============================================
CREATE TABLE IF NOT EXISTS daily_moods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  mood_score INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
  mood_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, local_date)
);

-- ============================================
-- 7. weekly_reports
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_valid_plays INTEGER NOT NULL DEFAULT 0,
  unique_song_count INTEGER NOT NULL DEFAULT 0,
  active_days INTEGER NOT NULL DEFAULT 0,
  mood_days INTEGER NOT NULL DEFAULT 0,
  average_mood NUMERIC,
  dominant_mood TEXT,
  mood_summary TEXT,
  top_songs JSONB NOT NULL DEFAULT '[]'::jsonb,
  mood_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  listening_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  share_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- ============================================
-- Updated_at triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER music_connections_updated_at
  BEFORE UPDATE ON music_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER playback_sessions_updated_at
  BEFORE UPDATE ON playback_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER daily_moods_updated_at
  BEFORE UPDATE ON daily_moods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER weekly_reports_updated_at
  BEFORE UPDATE ON weekly_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url, timezone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'UTC'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- music_connections (read status only, no tokens via RLS)
CREATE POLICY "Users can view own music connections"
  ON music_connections FOR SELECT
  USING (auth.uid() = user_id);

-- songs (read for authenticated users)
CREATE POLICY "Authenticated users can read songs"
  ON songs FOR SELECT TO authenticated USING (true);

-- playback_sessions
CREATE POLICY "Users can view own playback sessions"
  ON playback_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own playback sessions"
  ON playback_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own playback sessions"
  ON playback_sessions FOR UPDATE USING (auth.uid() = user_id);

-- listening_entries
CREATE POLICY "Users can view own listening entries"
  ON listening_entries FOR SELECT USING (auth.uid() = user_id);

-- daily_moods
CREATE POLICY "Users can view own moods"
  ON daily_moods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own moods"
  ON daily_moods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own moods"
  ON daily_moods FOR UPDATE USING (auth.uid() = user_id);

-- weekly_reports
CREATE POLICY "Users can view own weekly reports"
  ON weekly_reports FOR SELECT USING (auth.uid() = user_id);
