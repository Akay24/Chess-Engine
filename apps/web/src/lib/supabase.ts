import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export interface CloudGame {
  id?: string;
  created_at?: string;
  player_color: 'w' | 'b';
  level_id: number;
  result: string | null;
  fen: string;
  pgn: string;
  san_moves: string[];
  style_profile?: Record<string, any>;
  time_control?: Record<string, any>;
}

export interface CloudPlayerProfile {
  id?: string;
  updated_at?: string;
  player_id: string;
  sample_count: number;
  aggression: number;
  tactical: number;
  openness: number;
  king_safety: number;
  blunder_rate: number;
  confidence: number;
}

/**
 * Persists a completed chess game to Supabase.
 */
export async function saveCloudGame(game: CloudGame): Promise<{ id: string | null; error: string | null }> {
  if (!supabase) {
    return { id: null, error: 'Supabase is not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('games')
      .insert([game])
      .select('id')
      .single();

    if (error) {
      return { id: null, error: error.message };
    }

    return { id: data?.id || null, error: null };
  } catch (err: any) {
    return { id: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Retrieves a saved chess game from Supabase by its unique ID.
 */
export async function getCloudGame(id: string): Promise<{ game: CloudGame | null; error: string | null }> {
  if (!supabase) {
    return { game: null, error: 'Supabase is not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { game: null, error: error.message };
    }

    return { game: data as CloudGame, error: null };
  } catch (err: any) {
    return { game: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Upserts a player style profile to Supabase.
 */
export async function syncPlayerProfile(
  profile: CloudPlayerProfile
): Promise<{ success: boolean; error: string | null }> {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const { error } = await supabase
      .from('player_profiles')
      .upsert(
        {
          player_id: profile.player_id,
          sample_count: profile.sample_count,
          aggression: profile.aggression,
          tactical: profile.tactical,
          openness: profile.openness,
          king_safety: profile.king_safety,
          blunder_rate: profile.blunder_rate,
          confidence: profile.confidence,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'player_id' }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * Loads a player style profile from Supabase.
 */
export async function loadPlayerProfile(
  playerId: string
): Promise<{ profile: CloudPlayerProfile | null; error: string | null }> {
  if (!supabase) {
    return { profile: null, error: 'Supabase is not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('player_id', playerId)
      .single();

    if (error) {
      return { profile: null, error: error.message };
    }

    return { profile: data as CloudPlayerProfile, error: null };
  } catch (err: any) {
    return { profile: null, error: err.message || 'Unknown error' };
  }
}
