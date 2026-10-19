import { isSupabaseConfigured, saveCloudGame, getCloudGame, syncPlayerProfile, loadPlayerProfile } from './supabase';

describe('Supabase Client and Cloud Persistence', () => {
  it('detects configuration status gracefully', () => {
    expect(typeof isSupabaseConfigured).toBe('boolean');
  });

  it('handles saveCloudGame gracefully when unconfigured or configured', async () => {
    const res = await saveCloudGame({
      player_color: 'w',
      level_id: 5,
      result: 'White wins by checkmate',
      fen: '8/8/8/8/8/8/8/8 w - - 0 1',
      pgn: '1. e4 e5',
      san_moves: ['e4', 'e5']
    });

    // Should return an object with id or error without throwing
    expect(res).toHaveProperty('id');
    expect(res).toHaveProperty('error');
  });

  it('handles getCloudGame gracefully', async () => {
    const res = await getCloudGame('non-existent-id');
    expect(res).toHaveProperty('game');
    expect(res).toHaveProperty('error');
  });

  it('handles syncPlayerProfile gracefully', async () => {
    const res = await syncPlayerProfile({
      player_id: 'test-player',
      sample_count: 10,
      aggression: 0.6,
      tactical: 0.7,
      openness: 0.5,
      king_safety: 0.8,
      blunder_rate: 0.1,
      confidence: 0.85
    });

    expect(res).toHaveProperty('success');
    expect(res).toHaveProperty('error');
  });

  it('handles loadPlayerProfile gracefully', async () => {
    const res = await loadPlayerProfile('test-player');
    expect(res).toHaveProperty('profile');
    expect(res).toHaveProperty('error');
  });
});
