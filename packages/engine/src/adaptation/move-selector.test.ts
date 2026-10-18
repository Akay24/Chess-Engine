import { selectAdaptiveMove, CandidateMove, LEVEL_EVAL_WINDOWS } from './move-selector';
import { AdaptationPlan } from './style-model';
import { LEVEL_PRESETS } from '../presets';

describe('move-selector', () => {
  const dummyPlan: AdaptationPlan = {
    weights: {
      closedPosition: 0.8,
      tacticalSharpness: -0.6,
      pieceTrades: 0.9,
      kingDefense: 0.7
    },
    preferredStructure: 'closed',
    explanation: 'Defensive test plan'
  };

  describe('property-style eval window constraints', () => {
    it('NEVER selects a move outside the eval window across all 20 levels with synthetic candidates', () => {
      // Run across all 20 presets and diverse candidate sets
      for (const preset of LEVEL_PRESETS) {
        const windowCp = LEVEL_EVAL_WINDOWS[preset.id] ?? 30;

        // Generate synthetic MultiPV candidate batches
        for (let seed = 1; seed <= 25; seed++) {
          const bestScore = 50 + seed * 5;
          const candidates: CandidateMove[] = [
            { multipv: 1, uci: 'e2e4', san: 'e4', scoreCp: bestScore, depth: 15, pv: ['e2e4'] },
            { multipv: 2, uci: 'd2d4', san: 'd4', scoreCp: bestScore - Math.floor(windowCp * 0.4), depth: 15, pv: ['d2d4'] },
            { multipv: 3, uci: 'g1f3', san: 'Nf3', scoreCp: bestScore - Math.floor(windowCp * 0.8), depth: 15, pv: ['g1f3'] },
            // Candidate clearly OUTSIDE the window:
            { multipv: 4, uci: 'a2a4', san: 'a4', scoreCp: bestScore - (windowCp + 25), depth: 15, pv: ['a2a4'] }
          ];

          const selectedUci = selectAdaptiveMove(candidates, dummyPlan, preset, {
            adaptationEnabled: true,
            rngSeed: seed
          });

          const selectedCand = candidates.find(c => c.uci === selectedUci)!;
          expect(selectedCand).toBeDefined();

          // Core property: selected score must be >= bestScore - windowCp
          const minAllowedScore = bestScore - windowCp;
          expect(selectedCand.scoreCp).toBeGreaterThanOrEqual(minAllowedScore);
          expect(selectedCand.uci).not.toBe('a2a4'); // Out-of-window move should never be chosen
        }
      }
    });

    it('strictly turns off adaptation for Levels 19 and 20 (always picks line 1)', () => {
      const l19 = LEVEL_PRESETS.find(p => p.id === 19)!;
      const l20 = LEVEL_PRESETS.find(p => p.id === 20)!;

      const candidates: CandidateMove[] = [
        { multipv: 1, uci: 'e2e4', san: 'e4', scoreCp: 100, depth: 25, pv: ['e2e4'] },
        { multipv: 2, uci: 'd2d4', san: 'd4', scoreCp: 99, depth: 25, pv: ['d2d4'] },
        { multipv: 3, uci: 'c2c4', san: 'c4', scoreCp: 98, depth: 25, pv: ['c2c4'] }
      ];

      // Even if adaptationEnabled is true and another candidate matches the plan better,
      // L19 and L20 MUST return candidates[0]
      expect(selectAdaptiveMove(candidates, dummyPlan, l19, { adaptationEnabled: true })).toBe('e2e4');
      expect(selectAdaptiveMove(candidates, dummyPlan, l20, { adaptationEnabled: true })).toBe('e2e4');
    });

    it('always selects best move when adaptation is disabled', () => {
      const l5 = LEVEL_PRESETS.find(p => p.id === 5)!;
      const candidates: CandidateMove[] = [
        { multipv: 1, uci: 'e2e4', san: 'e4', scoreCp: 80, depth: 10, pv: ['e2e4'] },
        { multipv: 2, uci: 'd2d4', san: 'd4', scoreCp: 78, depth: 10, pv: ['d2d4'] }
      ];

      const chosen = selectAdaptiveMove(candidates, dummyPlan, l5, { adaptationEnabled: false });
      expect(chosen).toBe('e2e4');
    });

    it('never re-ranks on forced mate positions', () => {
      const l5 = LEVEL_PRESETS.find(p => p.id === 5)!;
      const mateCandidates: CandidateMove[] = [
        { multipv: 1, uci: 'd1h5', san: 'Qh5#', scoreCp: 30000, depth: 10, pv: ['d1h5'] },
        { multipv: 2, uci: 'c1f4', san: 'Bf4', scoreCp: 29990, depth: 10, pv: ['c1f4'] }
      ];

      const chosen = selectAdaptiveMove(mateCandidates, dummyPlan, l5, { adaptationEnabled: true });
      expect(chosen).toBe('d1h5');
    });

    it('handles single legal move cleanly without throwing', () => {
      const l5 = LEVEL_PRESETS.find(p => p.id === 5)!;
      const singleCandidate: CandidateMove[] = [
        { multipv: 1, uci: 'e8e7', san: 'Ke7', scoreCp: -500, depth: 5, pv: ['e8e7'] }
      ];

      expect(selectAdaptiveMove(singleCandidate, dummyPlan, l5, { adaptationEnabled: true })).toBe('e8e7');
    });

    it('throws error when candidates array is empty', () => {
      const l5 = LEVEL_PRESETS.find(p => p.id === 5)!;
      expect(() => selectAdaptiveMove([], dummyPlan, l5, { adaptationEnabled: true })).toThrow();
    });
  });
});
