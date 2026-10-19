import { useGameStore } from './useGameStore';
import { useEngineStore } from './useEngineStore';
import { useAdaptationStore } from './useAdaptationStore';
import { StyleVector, AdaptationPlan } from '@twentyfish/engine';

describe('Zustand Stores', () => {
  describe('useGameStore', () => {
    beforeEach(() => {
      useGameStore.getState().resetGame();
    });

    it('initializes with default chess board position', () => {
      const state = useGameStore.getState();
      expect(state.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(state.turn).toBe('w');
      expect(state.isGameOver).toBe(false);
      expect(state.sanMoves).toEqual([]);
    });

    it('makes legal player move and updates history and turn', () => {
      const move = useGameStore.getState().makeMove('e2', 'e4');
      expect(move).not.toBeNull();
      expect(move?.san).toBe('e4');

      const state = useGameStore.getState();
      expect(state.turn).toBe('b');
      expect(state.sanMoves).toEqual(['e4']);
      expect(state.moveHistory.length).toBe(1);
      expect(state.lastMove).toEqual({ from: 'e2', to: 'e4' });
    });

    it('rejects illegal moves', () => {
      const move = useGameStore.getState().makeMove('e2', 'e5'); // illegal jump
      expect(move).toBeNull();
      expect(useGameStore.getState().sanMoves).toEqual([]);
    });

    it('makes engine move via UCI format', () => {
      useGameStore.getState().makeMove('e2', 'e4');
      const engineMove = useGameStore.getState().makeEngineMove('e7e5');
      expect(engineMove).not.toBeNull();
      expect(engineMove?.san).toBe('e5');
      expect(useGameStore.getState().turn).toBe('w');
    });

    it('supports undoing moves cleanly', () => {
      useGameStore.getState().makeMove('e2', 'e4');
      useGameStore.getState().makeEngineMove('e7e5');
      expect(useGameStore.getState().sanMoves.length).toBe(2);

      useGameStore.getState().undoMove();
      expect(useGameStore.getState().sanMoves.length).toBe(0);
    });

    it('handles resignation and draw offer', () => {
      useGameStore.getState().resign();
      expect(useGameStore.getState().isGameOver).toBe(true);
      expect(useGameStore.getState().gameResult).toContain('wins by resignation');

      useGameStore.getState().resetGame();
      // Early draw offer with 0 moves should be rejected
      const earlyAccepted = useGameStore.getState().offerDraw();
      expect(earlyAccepted).toBe(false);
      expect(useGameStore.getState().isGameOver).toBe(false);

      // Play a quick sequence of moves to reach 10 plies
      useGameStore.getState().loadPgn('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7');
      expect(useGameStore.getState().sanMoves.length).toBe(10);

      const accepted = useGameStore.getState().offerDraw();
      expect(accepted).toBe(true);
      expect(useGameStore.getState().isGameOver).toBe(true);
      expect(useGameStore.getState().gameResult).toContain('drawn by mutual agreement');
    });
  });

  describe('useEngineStore', () => {
    beforeEach(() => {
      useEngineStore.getState().resetEngineState();
    });

    it('manages engine presets and thinking state', () => {
      useEngineStore.getState().setActiveLevelId(12);
      expect(useEngineStore.getState().activeLevelId).toBe(12);

      useEngineStore.getState().setThinking(true);
      expect(useEngineStore.getState().isThinking).toBe(true);
    });

    it('updates live engine statistics and MultiPV lines', () => {
      useEngineStore.getState().updateEngineInfo({
        depth: 14,
        nodes: 125000,
        nps: 450000,
        scoreCp: 45,
        multipv: 1,
        pv: ['e2e4', 'e7e5']
      });

      const state = useEngineStore.getState();
      expect(state.depth).toBe(14);
      expect(state.nodes).toBe(125000);
      expect(state.evalCp).toBe(45);
      expect(state.multiPvLines.length).toBe(1);
      expect(state.multiPvLines[0].pv).toEqual(['e2e4', 'e7e5']);
    });
  });

  describe('useAdaptationStore', () => {
    it('toggles adaptation setting', () => {
      expect(useAdaptationStore.getState().adaptationEnabled).toBe(false);
      useAdaptationStore.getState().toggleAdaptation();
      expect(useAdaptationStore.getState().adaptationEnabled).toBe(true);
      useAdaptationStore.getState().toggleAdaptation();
      expect(useAdaptationStore.getState().adaptationEnabled).toBe(false);
    });

    it('updates style vector and plan with status string', () => {
      const dummyVector: StyleVector = {
        aggression: { value: 0.8, confidence: 0.7 },
        tactical: { value: 0.75, confidence: 0.7 },
        openness: { value: 0.5, confidence: 0.5 },
        kingSafety: { value: 0.4, confidence: 0.6 },
        blunderRate: { value: 0.2, confidence: 0.5 }
      };

      const dummyPlan: AdaptationPlan = {
        weights: { closedPosition: 0.6, tacticalSharpness: -0.5, pieceTrades: 0.7, kingDefense: 0.8 },
        preferredStructure: 'closed',
        explanation: 'Steering toward solid closed structure'
      };

      useAdaptationStore.getState().updateStyle(dummyVector, dummyPlan, dummyPlan.explanation);

      const state = useAdaptationStore.getState();
      expect(state.styleVector).toEqual(dummyVector);
      expect(state.plan).toEqual(dummyPlan);
      expect(state.statusText).toBe('Steering toward solid closed structure');
    });
  });
});
