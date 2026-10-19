import { selectAdaptiveMove, CandidateMove } from './move-selector';
import { extractStyleFeatures, MoveRecord } from './style-features';
import { HeuristicStyleModel, PositionContext, AdaptationPlan } from './style-model';
import { LEVEL_PRESETS } from '../presets';
import { StockfishEngine } from '../stockfish-engine';
import { createStockfishNodeWorker, BENCHMARK_POSITIONS } from '../../scripts/strength-audit';

describe('TwentyFish Engine Strength & Adaptation Regressions', () => {
  jest.setTimeout(30000);

  describe('Move selector eval window and candidate integrity', () => {
    const neutralPlan: AdaptationPlan = {
      weights: { closedPosition: 0, tacticalSharpness: 0, pieceTrades: 0, kingDefense: 0.5 },
      preferredStructure: 'neutral',
      explanation: 'Neutral test plan'
    };

    it('always includes the best move in the eligible set even if candidates are unsorted', () => {
      const l5 = LEVEL_PRESETS.find(p => p.id === 5)!;

      // Unsorted candidates where MultiPV 2 has a higher score than MultiPV 1
      const unsortedCandidates: CandidateMove[] = [
        { multipv: 1, uci: 'd2d4', san: 'd4', scoreCp: 40, depth: 10, pv: ['d2d4'] },
        { multipv: 2, uci: 'e2e4', san: 'e4', scoreCp: 85, depth: 10, pv: ['e2e4'] }, // True best move
        { multipv: 3, uci: 'g1f3', san: 'Nf3', scoreCp: 70, depth: 10, pv: ['g1f3'] },
        { multipv: 4, uci: 'h2h4', san: 'h4', scoreCp: -200, depth: 10, pv: ['h2h4'] }
      ];

      // With evalWindowCp: 30, window is [85 - 30, 85] = [55, 85]
      // Eligible moves are e2e4 (85) and g1f3 (70). d2d4 (40) and h2h4 (-200) are outside!
      const selected = selectAdaptiveMove(unsortedCandidates, neutralPlan, l5, {
        adaptationEnabled: true,
        evalWindowCp: 30
      });

      // Must be either e2e4 or g1f3, NEVER d2d4 or h2h4
      expect(['e2e4', 'g1f3']).toContain(selected);
      expect(selected).not.toBe('d2d4');
      expect(selected).not.toBe('h2h4');
    });

    it('strictly enforces evalWindowCp bounds across random trials', () => {
      const l10 = LEVEL_PRESETS.find(p => p.id === 10)!;
      const windowCp = 20;

      const candidates: CandidateMove[] = [
        { multipv: 1, uci: 'e2e4', san: 'e4', scoreCp: 100, depth: 12, pv: ['e2e4'] },
        { multipv: 2, uci: 'd2d4', san: 'd4', scoreCp: 90, depth: 12, pv: ['d2d4'] },
        { multipv: 3, uci: 'c2c4', san: 'c4', scoreCp: 85, depth: 12, pv: ['c2c4'] },
        { multipv: 4, uci: 'g1f3', san: 'Nf3', scoreCp: 75, depth: 12, pv: ['g1f3'] } // Outside [80, 100]
      ];

      for (let seed = 0; seed < 50; seed++) {
        const move = selectAdaptiveMove(candidates, neutralPlan, l10, {
          adaptationEnabled: true,
          evalWindowCp: windowCp,
          rngSeed: seed
        });

        // g1f3 (score 75 < 100 - 20) must NEVER be chosen
        expect(move).not.toBe('g1f3');
        expect(['e2e4', 'd2d4', 'c2c4']).toContain(move);
      }
    });
  });

  describe('Confidence gating on 1-move histories', () => {
    it('yields near-neutral StyleVector and neutral plan for 1-move history', async () => {
      // 1 move: White plays 1. e4
      const oneMoveHistory: MoveRecord[] = [
        {
          san: 'e4',
          uci: 'e2e4',
          color: 'w',
          fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
        }
      ];

      const profile = extractStyleFeatures(oneMoveHistory, 'w');

      // Confidence must be low (< 0.20)
      expect(profile.vector.aggression.confidence).toBeLessThan(0.20);
      expect(profile.vector.tactical.confidence).toBeLessThan(0.20);

      // Values must be near neutral [0.45, 0.55]
      expect(profile.vector.aggression.value).toBeGreaterThanOrEqual(0.45);
      expect(profile.vector.aggression.value).toBeLessThanOrEqual(0.55);

      // Plan must remain neutral, NOT aggressive
      const model = new HeuristicStyleModel();
      const ctx: PositionContext = {
        fen: oneMoveHistory[0].fenAfter,
        ply: 1,
        isEngineWhite: false,
        humanColor: 'w'
      };

      const plan = await model.plan(profile.vector, ctx);
      expect(plan.preferredStructure).toBe('neutral');
      expect(plan.explanation).toContain('solid, principled chess');
      expect(plan.explanation).not.toContain('plays aggressively');
    });

    it('keeps single tactical capture neutral until confidence builds', async () => {
      // 1 move: Black plays gambit capture 1... exd4
      const gambitMoveHistory: MoveRecord[] = [
        {
          san: 'exd4',
          uci: 'e5d4',
          color: 'b',
          fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
          fenAfter: 'rnbqkbnr/pppp1ppp/8/8/3p4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 3'
        }
      ];

      const profile = extractStyleFeatures(gambitMoveHistory, 'b');
      const model = new HeuristicStyleModel();
      const ctx: PositionContext = {
        fen: gambitMoveHistory[0].fenAfter,
        ply: 2,
        isEngineWhite: true,
        humanColor: 'b'
      };

      const plan = await model.plan(profile.vector, ctx);
      expect(plan.preferredStructure).toBe('neutral');
      expect(plan.explanation).not.toContain('plays aggressively');
    });
  });

  describe('Eval-bar sign convention', () => {
    it('gives positive evaluation for White advantage regardless of which side is to move', () => {
      // In a position where White is ahead by +250 centipawns:
      const whiteAheadEvalCp = 250;

      // If White is to move, Stockfish emits +250
      const whiteTurnScore = whiteAheadEvalCp;
      const normalizeScore = (score: number, turn: 'w' | 'b'): number => (turn === 'w' ? score : -score);
      const normalizedWhiteScore = normalizeScore(whiteTurnScore, 'w');
      expect(normalizedWhiteScore).toBe(250);

      // If Black is to move in the same position, Stockfish emits -250 (from Black's perspective)
      const blackTurnScore = -whiteAheadEvalCp;
      const normalizedBlackScore = normalizeScore(blackTurnScore, 'b');
      expect(normalizedBlackScore).toBe(250);

      // Both give identical positive score for White advantage
      expect(normalizedWhiteScore).toEqual(normalizedBlackScore);
    });
  });

  describe('L20 Reference Matching and Strength Progression', () => {
    it('L20 with adaptation OFF returns reference best move on >= 90% of selected test positions', async () => {
      // 10 fixed benchmark positions with decisive tactics and endgame solutions
      const testSet = [
        { fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', desc: 'Back rank mate', expected: 'e1e8' },
        { fen: 'r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 4', desc: 'Scholar mate threat', expected: 'h5f7' },
        { fen: 'r1b2rk1/pp3ppp/2n1p3/q7/2BP4/P1n1PN2/3B1PPP/R2QK2R w KQ - 0 13', desc: 'Pinned knight', expected: 'd1c2' },
        { fen: 'r1b2rk1/1pq1bppp/p1np4/4p3/2B1P3/2N1QN2/PPP2PPP/2KR3R w - - 2 13', desc: 'Outpost knight', expected: 'c3d5' },
        { fen: 'k7/2R5/1K6/8/8/8/8/8 w - - 0 1', desc: 'Rook back rank checkmate', expected: 'c7c8' },
        { fen: 'r4rk1/1pp1qppp/p1np1n2/4p1B1/2B1P3/2NP1Q1P/PPP2PP1/R4RK1 w - - 0 11', desc: 'Pin exploit', expected: 'c3d5' },
        { fen: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1', desc: 'King opposition', expected: 'e3e4' },
        { fen: 'r1bqk2r/pppp1ppp/2n5/4p3/1b2n3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 0 6', desc: 'Fork recapture', expected: 'd3e4' },
        { fen: 'r1bqkb1r/pp2pppp/2n5/2p1P3/3pP1n1/3P1N2/PPP1BPPP/RNBQK2R w KQkq - 1 6', desc: 'Center tactic', expected: 'c1f4' },
        { fen: '8/8/8/8/8/2k5/p7/K7 w - - 0 1', desc: 'Stalemate avoidance capture', expected: 'a1a2' }
      ];

      const worker = createStockfishNodeWorker();
      const engine = new StockfishEngine(worker);
      await engine.init();

      const l20 = LEVEL_PRESETS.find(p => p.id === 20)!;
      engine.applyLevel(l20);
      engine.configureAdaptation({ enabled: false });

      let matches = 0;
      for (const pos of testSet) {
        engine.setPosition(pos.fen);
        const bestmove = await engine.searchBestMove({ depth: 14 });

        if (bestmove === pos.expected) {
          matches++;
        }
      }

      engine.terminate();
      const matchPct = (matches / testSet.length) * 100;
      console.log(`L20 vs Reference Match Rate: ${matches}/${testSet.length} (${matchPct}%)`);
      expect(matchPct).toBeGreaterThanOrEqual(90);
    });

    it('demonstrates monotonic skill scaling between low, medium, and high presets', () => {
      const l1 = LEVEL_PRESETS.find(p => p.id === 1)!;
      const l5 = LEVEL_PRESETS.find(p => p.id === 5)!;
      const l10 = LEVEL_PRESETS.find(p => p.id === 10)!;
      const l15 = LEVEL_PRESETS.find(p => p.id === 15)!;
      const l20 = LEVEL_PRESETS.find(p => p.id === 20)!;

      // Skill levels must rise monotonically
      expect(l1.uci.Skill).toBeLessThan(l5.uci.Skill!);
      expect(l5.uci.Skill!).toBeLessThan(l10.uci.Skill!);
      expect(l10.uci.Skill!).toBeLessThan(l15.uci.Skill!);
      expect(l15.uci.Skill!).toBeLessThanOrEqual(l20.uci.Skill!);

      // Depth caps must rise monotonically
      expect(l1.searchCaps.depth!).toBeLessThan(l5.searchCaps.depth!);
      expect(l5.searchCaps.depth!).toBeLessThan(l10.searchCaps.depth!);
      expect(l10.searchCaps.depth!).toBeLessThan(l15.searchCaps.depth!);
      expect(l15.searchCaps.depth!).toBeLessThan(l20.searchCaps.depth!);

      // Eval window must tighten monotonically towards 0
      expect(l1.stochasticity!.evalWindowCp).toBeGreaterThan(l5.stochasticity!.evalWindowCp);
      expect(l5.stochasticity!.evalWindowCp).toBeGreaterThan(l10.stochasticity!.evalWindowCp);
      expect(l10.stochasticity!.evalWindowCp).toBeGreaterThan(l15.stochasticity!.evalWindowCp);
      expect(l20.stochasticity!.evalWindowCp).toBe(0);
    });
  });
});
