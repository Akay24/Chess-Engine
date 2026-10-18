import { extractStyleFeatures, identifyOpening, calculateConfidence, MoveRecord } from './style-features';

describe('style-features', () => {
  describe('calculateConfidence', () => {
    it('returns 0 for empty or negative sample size', () => {
      expect(calculateConfidence(0)).toBe(0);
      expect(calculateConfidence(-5)).toBe(0);
    });

    it('grows asymptotically towards 1 as sample size increases', () => {
      const c5 = calculateConfidence(5);
      const c15 = calculateConfidence(15);
      const c30 = calculateConfidence(30);

      expect(c5).toBeGreaterThan(0.3);
      expect(c15).toBeGreaterThan(c5);
      expect(c30).toBeGreaterThan(c15);
      expect(c30).toBeLessThanOrEqual(1.0);
    });
  });

  describe('identifyOpening', () => {
    it('identifies standard ECO lines', () => {
      expect(identifyOpening(['e4', 'c5'])?.eco).toBe('B20');
      expect(identifyOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])?.eco).toBe('C50');
      expect(identifyOpening(['d4', 'd5', 'c4'])?.eco).toBe('D06');
      expect(identifyOpening(['d4', 'd5', 'c4', 'e6'])?.eco).toBe('D30');
      expect(identifyOpening(['c4'])?.eco).toBe('A10');
    });

    it('returns null on empty move sequence', () => {
      expect(identifyOpening([])).toBeNull();
    });
  });

  describe('extractStyleFeatures edge cases', () => {
    it('handles empty move history cleanly', () => {
      const profile = extractStyleFeatures([], 'w');
      expect(profile.movesCount).toBe(0);
      expect(profile.vector.aggression.confidence).toBe(0);
      expect(profile.vector.aggression.value).toBe(0.5);
      expect(profile.vector.tactical.confidence).toBe(0);
      expect(profile.vector.timePressure).toBeUndefined();
    });

    it('handles single move without clock data', () => {
      const singleMove: MoveRecord[] = [
        {
          san: 'e4',
          uci: 'e2e4',
          color: 'w',
          fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
        }
      ];

      const profile = extractStyleFeatures(singleMove, 'w');
      expect(profile.movesCount).toBe(1);
      // Low confidence keeps value close to neutral (0.5)
      expect(profile.vector.aggression.confidence).toBeLessThan(0.2);
      expect(profile.vector.aggression.value).toBeCloseTo(0.5, 1);
      // Clock dimension must be omitted when not provided
      expect(profile.vector.timePressure).toBeUndefined();
    });

    it('includes timePressure dimension when clock data exists', () => {
      const movesWithClock: MoveRecord[] = [
        {
          san: 'e4',
          uci: 'e2e4',
          color: 'w',
          fenBefore: 'fen1',
          fenAfter: 'fen2',
          clockRemainingMs: 5000,
          timeSpentMs: 400
        },
        {
          san: 'e5',
          uci: 'e7e5',
          color: 'b',
          fenBefore: 'fen2',
          fenAfter: 'fen3',
          clockRemainingMs: 5000,
          timeSpentMs: 400
        }
      ];

      const profile = extractStyleFeatures(movesWithClock, 'w');
      expect(profile.vector.timePressure).toBeDefined();
      expect(profile.vector.timePressure?.confidence).toBeGreaterThan(0);
    });
  });

  describe('extractStyleFeatures game profiles', () => {
    it('detects high aggression and tactics in an aggressive attacking game', () => {
      // White plays King's Gambit / aggressive sacrifices: e4, f4, fxe5, Qh5+, Bc4, Qxf7#
      const aggressiveMoves: MoveRecord[] = [
        { san: 'e4', uci: 'e2e4', color: 'w', fenBefore: '', fenAfter: '' },
        { san: 'e5', uci: 'e7e5', color: 'b', fenBefore: '', fenAfter: '' },
        { san: 'f4', uci: 'f2f4', color: 'w', fenBefore: '', fenAfter: '' },
        { san: 'exf4', uci: 'e5f4', color: 'b', fenBefore: '', fenAfter: '' },
        { san: 'Bc4', uci: 'f1c4', color: 'w', fenBefore: '', fenAfter: '' },
        { san: 'g5', uci: 'g7g5', color: 'b', fenBefore: '', fenAfter: '' },
        { san: 'Qh5', uci: 'd1h5', color: 'w', fenBefore: '', fenAfter: '' },
        { san: 'Nf6', uci: 'g8f6', color: 'b', fenBefore: '', fenAfter: '' },
        { san: 'Qxf7+', uci: 'h5f7', color: 'w', fenBefore: '', fenAfter: '' },
        { san: 'Kd8', uci: 'e8d8', color: 'b', fenBefore: '', fenAfter: '' },
        { san: 'Nf3', uci: 'g1f3', color: 'w', fenBefore: '', fenAfter: '' },
        { san: 'd6', uci: 'd7d6', color: 'b', fenBefore: '', fenAfter: '' },
        { san: 'd4', uci: 'd2d4', color: 'w', fenBefore: '', fenAfter: '' },
        { san: 'Bg4', uci: 'c8g4', color: 'b', fenBefore: '', fenAfter: '' },
        { san: 'Bxf4', uci: 'c1f4', color: 'w', fenBefore: '', fenAfter: '' }
      ];

      const whiteProfile = extractStyleFeatures(aggressiveMoves, 'w');
      expect(whiteProfile.movesCount).toBe(8);
      expect(whiteProfile.vector.aggression.value).toBeGreaterThan(0.5);
      expect(whiteProfile.vector.tactical.value).toBeGreaterThan(0.5);
    });

    it('detects positional / quiet style in a slow closed game', () => {
      // White plays quiet positional lines: Nf3, g3, Bg2, O-O, d3, c3, Nbd2
      const quietMoves: MoveRecord[] = [
        { san: 'Nf3', uci: 'g1f3', color: 'w', fenBefore: '', fenAfter: '' },
        { san: 'd5', uci: 'd7d5', color: 'b', fenBefore: '', fenAfter: '' },
        { san: 'g3', uci: 'g2g3', color: 'w', fenBefore: '', fenAfter: '' },
        { san: 'Nf6', uci: 'g8f6', color: 'b', fenBefore: '', fenAfter: '' },
        { san: 'Bg2', uci: 'f1g2', color: 'w', fenBefore: '', fenAfter: '' },
        { san: 'e6', uci: 'e7e6', color: 'b', fenBefore: '', fenAfter: '' },
        { san: 'O-O', uci: 'e1g1', color: 'w', fenBefore: '', fenAfter: '' },
        { san: 'Be7', uci: 'f8e7', color: 'b', fenBefore: '', fenAfter: '' },
        { san: 'd3', uci: 'd2d3', color: 'w', fenBefore: '', fenAfter: '' },
        { san: 'O-O', uci: 'e8g8', color: 'b', fenBefore: '', fenAfter: '' },
        { san: 'Nbd2', uci: 'b1d2', color: 'w', fenBefore: '', fenAfter: '' },
        { san: 'c5', uci: 'c7c5', color: 'b', fenBefore: '', fenAfter: '' },
        { san: 'c3', uci: 'c2c3', color: 'w', fenBefore: '', fenAfter: '' },
        { san: 'Nc6', uci: 'b8c6', color: 'b', fenBefore: '', fenAfter: '' },
        { san: 'e4', uci: 'e2e4', color: 'w', fenBefore: '', fenAfter: '' }
      ];

      const whiteProfile = extractStyleFeatures(quietMoves, 'w');
      expect(whiteProfile.movesCount).toBe(8);
      // Early O-O ensures high king safety
      expect(whiteProfile.vector.kingSafety.value).toBeGreaterThan(0.55);
      // Zero checks, zero captures -> tactical score stays low/neutral
      expect(whiteProfile.vector.tactical.value).toBeLessThanOrEqual(0.5);
    });
  });
});
