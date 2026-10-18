import { create } from 'zustand';
import { Chess, Move, Square } from 'chess.js';
import { MoveRecord } from '@twentyfish/engine';

export type BoardTheme = 'standard' | 'emerald' | 'wood' | 'ocean' | 'midnight';

export interface ClockState {
  whiteMs: number;
  blackMs: number;
  incrementMs: number;
  isRunning: boolean;
}

interface GameState {
  fen: string;
  turn: 'w' | 'b';
  playerColor: 'w' | 'b';
  sanMoves: string[];
  moveHistory: MoveRecord[];
  selectedPly: number | null;
  lastMove: { from: string; to: string } | null;
  inCheck: boolean;
  isGameOver: boolean;
  gameResult: string | null;

  // Clocks
  clock: ClockState;

  // Theme & Appearance
  boardTheme: BoardTheme;
  darkMode: boolean;

  // Actions
  initializeGame: (initialFen?: string) => void;
  makeMove: (source: string, target: string, promo?: string) => Move | null;
  makeEngineMove: (uciMove: string) => Move | null;
  undoMove: () => boolean;
  selectPly: (ply: number | null) => void;
  setPlayerColor: (color: 'w' | 'b') => void;
  resign: () => void;
  offerDraw: () => void;
  resetGame: () => void;
  setBoardTheme: (theme: BoardTheme) => void;
  toggleDarkMode: () => void;
  tickClock: (elapsedMs: number) => void;
  setTimeControl: (baseSec: number, incrementSec: number) => void;
  loadPgn: (pgn: string) => boolean;
  getPgn: () => string;
}

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
let chessInstance = new Chess();

export const useGameStore = create<GameState>((set, get) => ({
  fen: DEFAULT_FEN,
  turn: 'w',
  playerColor: 'w',
  sanMoves: [],
  moveHistory: [],
  selectedPly: null,
  lastMove: null,
  inCheck: false,
  isGameOver: false,
  gameResult: null,

  clock: {
    whiteMs: 600000, // 10 minutes default
    blackMs: 600000,
    incrementMs: 0,
    isRunning: false
  },

  boardTheme: 'emerald',
  darkMode: false,

  initializeGame: (initialFen) => {
    chessInstance = new Chess(initialFen || DEFAULT_FEN);
    set({
      fen: chessInstance.fen(),
      turn: chessInstance.turn(),
      sanMoves: [],
      moveHistory: [],
      selectedPly: null,
      lastMove: null,
      inCheck: chessInstance.inCheck(),
      isGameOver: chessInstance.isGameOver(),
      gameResult: null,
      clock: {
        ...get().clock,
        whiteMs: 600000,
        blackMs: 600000,
        isRunning: false
      }
    });
  },

  makeMove: (source, target, promo = 'q') => {
    try {
      const fenBefore = chessInstance.fen();
      const move = chessInstance.move({
        from: source as Square,
        to: target as Square,
        promotion: promo as any
      });

      if (!move) return null;

      const fenAfter = chessInstance.fen();
      const moveRecord: MoveRecord = {
        san: move.san,
        uci: `${source}${target}${move.promotion || ''}`,
        color: move.color,
        fenBefore,
        fenAfter,
        clockRemainingMs: move.color === 'w' ? get().clock.whiteMs : get().clock.blackMs
      };

      const isGameOver = chessInstance.isGameOver();
      let gameResult: string | null = null;
      if (isGameOver) {
        if (chessInstance.isCheckmate()) {
          gameResult = move.color === 'w' ? 'White wins by checkmate' : 'Black wins by checkmate';
        } else if (chessInstance.isDraw()) {
          gameResult = 'Game drawn';
        }
      }

      set((state) => ({
        fen: fenAfter,
        turn: chessInstance.turn(),
        sanMoves: chessInstance.history(),
        moveHistory: [...state.moveHistory, moveRecord],
        selectedPly: null,
        lastMove: { from: source, to: target },
        inCheck: chessInstance.inCheck(),
        isGameOver,
        gameResult,
        clock: {
          ...state.clock,
          isRunning: !isGameOver,
          whiteMs: move.color === 'w' ? state.clock.whiteMs + state.clock.incrementMs : state.clock.whiteMs,
          blackMs: move.color === 'b' ? state.clock.blackMs + state.clock.incrementMs : state.clock.blackMs
        }
      }));

      return move;
    } catch {
      return null;
    }
  },

  makeEngineMove: (uciMove) => {
    if (!uciMove || uciMove.length < 4) return null;
    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    const promo = uciMove.length > 4 ? uciMove[4] : undefined;
    return get().makeMove(from, to, promo);
  },

  undoMove: () => {
    // Undo both engine move and human move to return turn to player
    if (get().moveHistory.length === 0) return false;

    chessInstance.undo();
    if (chessInstance.turn() !== get().playerColor && get().moveHistory.length > 1) {
      chessInstance.undo();
    }

    const history = chessInstance.history({ verbose: true });
    const last = history[history.length - 1];

    set((state) => ({
      fen: chessInstance.fen(),
      turn: chessInstance.turn(),
      sanMoves: chessInstance.history(),
      moveHistory: state.moveHistory.slice(0, history.length),
      selectedPly: null,
      lastMove: last ? { from: last.from, to: last.to } : null,
      inCheck: chessInstance.inCheck(),
      isGameOver: false,
      gameResult: null
    }));

    return true;
  },

  selectPly: (ply) => set({ selectedPly: ply }),

  setPlayerColor: (color) => {
    set({ playerColor: color });
    get().resetGame();
  },

  resign: () => {
    const winner = get().playerColor === 'w' ? 'Black' : 'White';
    set({
      isGameOver: true,
      gameResult: `${winner} wins by resignation`,
      clock: { ...get().clock, isRunning: false }
    });
  },

  offerDraw: () => {
    set({
      isGameOver: true,
      gameResult: 'Game drawn by mutual agreement',
      clock: { ...get().clock, isRunning: false }
    });
  },

  resetGame: () => {
    chessInstance = new Chess();
    set({
      fen: DEFAULT_FEN,
      turn: 'w',
      sanMoves: [],
      moveHistory: [],
      selectedPly: null,
      lastMove: null,
      inCheck: false,
      isGameOver: false,
      gameResult: null,
      clock: { ...get().clock, isRunning: false }
    });
  },

  setBoardTheme: (theme) => set({ boardTheme: theme }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  tickClock: (elapsedMs) => {
    const { clock, turn, isGameOver } = get();
    if (!clock.isRunning || isGameOver) return;

    if (turn === 'w') {
      const newTime = Math.max(0, clock.whiteMs - elapsedMs);
      set({
        clock: { ...clock, whiteMs: newTime },
        ...(newTime === 0 ? { isGameOver: true, gameResult: 'Black wins on time' } : {})
      });
    } else {
      const newTime = Math.max(0, clock.blackMs - elapsedMs);
      set({
        clock: { ...clock, blackMs: newTime },
        ...(newTime === 0 ? { isGameOver: true, gameResult: 'White wins on time' } : {})
      });
    }
  },

  setTimeControl: (baseSec, incrementSec) => {
    set({
      clock: {
        whiteMs: baseSec * 1000,
        blackMs: baseSec * 1000,
        incrementMs: incrementSec * 1000,
        isRunning: false
      }
    });
  },

  loadPgn: (pgn) => {
    try {
      const temp = new Chess();
      temp.loadPgn(pgn);
      chessInstance = temp;
      const history = chessInstance.history({ verbose: true });
      const last = history[history.length - 1];

      set({
        fen: chessInstance.fen(),
        turn: chessInstance.turn(),
        sanMoves: chessInstance.history(),
        moveHistory: [],
        selectedPly: null,
        lastMove: last ? { from: last.from, to: last.to } : null,
        inCheck: chessInstance.inCheck(),
        isGameOver: chessInstance.isGameOver(),
        gameResult: chessInstance.isCheckmate() ? 'Checkmate' : chessInstance.isDraw() ? 'Draw' : null
      });
      return true;
    } catch {
      return false;
    }
  },

  getPgn: () => chessInstance.pgn()
}));
