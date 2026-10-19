-- TwentyFish Database Schema: Cloud Games and Opponent Style Profiles
-- Compatible with Supabase Postgres

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  player_color VARCHAR(1) NOT NULL,
  level_id INTEGER NOT NULL,
  result TEXT,
  fen TEXT NOT NULL,
  pgn TEXT,
  san_moves TEXT[] DEFAULT '{}',
  style_profile JSONB,
  time_control JSONB
);

CREATE TABLE IF NOT EXISTS player_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  player_id TEXT UNIQUE NOT NULL,
  sample_count INTEGER DEFAULT 0,
  aggression NUMERIC DEFAULT 0.5,
  tactical NUMERIC DEFAULT 0.5,
  openness NUMERIC DEFAULT 0.5,
  king_safety NUMERIC DEFAULT 0.5,
  blunder_rate NUMERIC DEFAULT 0.5,
  confidence NUMERIC DEFAULT 0.0
);

-- Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'games' AND policyname = 'Allow public read access to games') THEN
    CREATE POLICY "Allow public read access to games" ON games FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'games' AND policyname = 'Allow public insert to games') THEN
    CREATE POLICY "Allow public insert to games" ON games FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_profiles' AND policyname = 'Allow public access to player_profiles') THEN
    CREATE POLICY "Allow public access to player_profiles" ON player_profiles FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
