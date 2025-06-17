/*
  # Game Persistence Schema

  1. New Tables
    - `games`
      - `id` (text, primary key) - Game room code
      - `host_user_id` (uuid) - Reference to the host user
      - `game_phase` (text) - Current phase: lobby, playing, finished
      - `current_player_index` (integer) - Index of current player
      - `deck` (jsonb) - Remaining cards in deck
      - `discard_pile` (jsonb) - Played cards
      - `current_prompt` (text) - Current conversation prompt
      - `winner_player_id` (text) - ID of winning player
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `last_activity` (timestamp) - For cleanup of inactive games

    - `game_players`
      - `id` (uuid, primary key)
      - `game_id` (text) - Reference to games table
      - `player_id` (text) - Unique player identifier
      - `user_id` (uuid) - Reference to user_profiles (nullable for guests)
      - `name` (text) - Player display name
      - `hand` (jsonb) - Player's cards
      - `is_host` (boolean) - Whether player is game host
      - `video_enabled` (boolean)
      - `audio_enabled` (boolean)
      - `is_connected` (boolean)
      - `joined_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for game access and player management

  3. Indexes
    - Add indexes for efficient querying
*/

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id text PRIMARY KEY,
  host_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  game_phase text NOT NULL DEFAULT 'lobby' CHECK (game_phase IN ('lobby', 'playing', 'finished')),
  current_player_index integer NOT NULL DEFAULT 0,
  deck jsonb NOT NULL DEFAULT '[]'::jsonb,
  discard_pile jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_prompt text,
  winner_player_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now()
);

-- Create game_players table
CREATE TABLE IF NOT EXISTS game_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id text NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id text NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  hand jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_host boolean NOT NULL DEFAULT false,
  video_enabled boolean NOT NULL DEFAULT true,
  audio_enabled boolean NOT NULL DEFAULT true,
  is_connected boolean NOT NULL DEFAULT true,
  joined_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_games_host_user_id ON games(host_user_id);
CREATE INDEX IF NOT EXISTS idx_games_game_phase ON games(game_phase);
CREATE INDEX IF NOT EXISTS idx_games_last_activity ON games(last_activity);
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_player_id ON game_players(player_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON game_players(user_id);

-- Add unique constraint for player_id per game
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_players_unique_player_per_game 
ON game_players(game_id, player_id);

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies for games table
CREATE POLICY "Anyone can read games they're playing in"
  ON games
  FOR SELECT
  TO authenticated, anon
  USING (
    id IN (
      SELECT game_id FROM game_players 
      WHERE user_id = auth.uid() OR auth.uid() IS NULL
    )
  );

CREATE POLICY "Game hosts can update their games"
  ON games
  FOR UPDATE
  TO authenticated, anon
  USING (
    host_user_id = auth.uid() OR 
    id IN (
      SELECT game_id FROM game_players 
      WHERE player_id = current_setting('app.current_player_id', true) AND is_host = true
    )
  );

CREATE POLICY "Anyone can create games"
  ON games
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- RLS Policies for game_players table
CREATE POLICY "Anyone can read players in games they're in"
  ON game_players
  FOR SELECT
  TO authenticated, anon
  USING (
    game_id IN (
      SELECT game_id FROM game_players gp2 
      WHERE gp2.user_id = auth.uid() OR auth.uid() IS NULL
    )
  );

CREATE POLICY "Anyone can insert themselves as players"
  ON game_players
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Players can update their own data"
  ON game_players
  FOR UPDATE
  TO authenticated, anon
  USING (
    user_id = auth.uid() OR 
    player_id = current_setting('app.current_player_id', true)
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_activity = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_games_updated_at();

-- Function to clean up old inactive games (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_inactive_games()
RETURNS void AS $$
BEGIN
  DELETE FROM games 
  WHERE last_activity < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql;