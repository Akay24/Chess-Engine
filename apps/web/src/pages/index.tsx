import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import { StockfishEngine, LEVEL_PRESETS } from '@twentyfish/engine';

import { useGameStore, BoardTheme } from '../store/useGameStore';
import { useEngineStore } from '../store/useEngineStore';
import { useAdaptationStore } from '../store/useAdaptationStore';

import { EvalBar } from '../components/EvalBar';
import { EngineStats } from '../components/EngineStats';
import { ClockDisplay } from '../components/ClockDisplay';
import { MoveList } from '../components/MoveList';
import { GameControls } from '../components/GameControls';
import { AdaptationPanel } from '../components/AdaptationPanel';
import { ThemePicker, THEME_COLORS } from '../components/ThemePicker';

export default function HomePage() {
  const {
    fen,
    turn,
    playerColor,
    sanMoves,
    moveHistory,
    selectedPly,
    lastMove,
    inCheck,
    isGameOver,
    gameResult,
    clock,
    boardTheme,
    darkMode,
    initializeGame,
    makeMove,
    makeEngineMove,
    undoMove,
    selectPly,
    setPlayerColor,
    resign,
    offerDraw,
    resetGame,
    setBoardTheme,
    toggleDarkMode,
    tickClock,
    loadPgn,
    getPgn
  } = useGameStore();

  const {
    activeLevelId,
    setActiveLevelId,
    isThinking,
    setThinking,
    evalCp,
    isMate,
    mateIn,
    depth,
    nodes,
    nps,
    currentPv,
    multiPvLines,
    updateEngineInfo,
    resetEngineState
  } = useEngineStore();

  const {
    adaptationEnabled,
    updateStyle,
    resetAdaptation
  } = useAdaptationStore();

  const [engineReady, setEngineReady] = useState(false);
  const [mobileTab, setMobileTab] = useState<'board' | 'moves' | 'profile'>('board');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargetSquares, setLegalTargetSquares] = useState<string[]>([]);

  const engineRef = useRef<StockfishEngine | null>(null);

  // Active level preset object
  const activeLevel = useMemo(() => {
    return LEVEL_PRESETS.find((l) => l.id === activeLevelId) || LEVEL_PRESETS[4];
  }, [activeLevelId]);

  // Initialize engine worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const engine = new StockfishEngine('/workers/engine-worker.js');

      engine.on('ready', () => {
        setEngineReady(true);
        engine.applyLevel(activeLevel);
        engine.configureAdaptation({ enabled: adaptationEnabled });
      });

      engine.on('info', (info: any) => {
        updateEngineInfo({
          depth: info.depth,
          nodes: info.nodes,
          nps: info.nps,
          scoreCp: info.score?.unit === 'cp' ? info.score.value : undefined,
          isMate: info.score?.unit === 'mate',
          mateIn: info.score?.unit === 'mate' ? info.score.value : null,
          pv: info.pv,
          multipv: info.multipv
        });
      });

      engine.on('styleUpdate', (event: any) => {
        updateStyle(event.vector, event.plan, event.status);
      });

      engine.init().catch(console.error);
      engineRef.current = engine;

      return () => {
        engine.terminate();
      };
    } catch (err) {
      console.error('Failed to instantiate Stockfish worker:', err);
    }
  }, []);

  // Sync level preset changes to engine
  useEffect(() => {
    if (engineRef.current && engineReady) {
      engineRef.current.applyLevel(activeLevel);
    }
  }, [activeLevel, engineReady]);

  // Sync adaptation toggle to engine
  useEffect(() => {
    if (engineRef.current && engineReady) {
      engineRef.current.configureAdaptation({ enabled: adaptationEnabled });
    }
  }, [adaptationEnabled, engineReady]);

  // Clock tick timer
  useEffect(() => {
    if (!clock.isRunning || isGameOver) return;
    const interval = setInterval(() => {
      tickClock(100);
    }, 100);
    return () => clearInterval(interval);
  }, [clock.isRunning, isGameOver, tickClock]);

  // Trigger engine response when it's the engine's turn
  useEffect(() => {
    if (isGameOver || !engineReady || !engineRef.current) return;

    const isEngineTurn = turn !== playerColor;
    if (isEngineTurn && !isThinking) {
      setThinking(true);

      const engine = engineRef.current;
      engine.setPosition(fen);

      // Async update opponent style profiling in worker
      engine.updateOpponentStyle(moveHistory, playerColor).catch(console.error);

      // Search best move
      engine.searchBestMove()
        .then((bestMove) => {
          setThinking(false);
          if (bestMove && bestMove !== '0000') {
            makeEngineMove(bestMove);
          }
        })
        .catch((err) => {
          setThinking(false);
          console.error('Engine search error:', err);
        });
    }
  }, [fen, turn, playerColor, isGameOver, engineReady, isThinking]);

  // Calculate legal move highlight squares
  const getLegalMoves = useCallback((square: Square) => {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ square, verbose: true });
      return moves.map(m => m.to);
    } catch {
      return [];
    }
  }, [fen]);

  const handleSquareClick = (square: Square) => {
    if (isGameOver || turn !== playerColor) return;

    if (selectedSquare) {
      if (legalTargetSquares.includes(square)) {
        makeMove(selectedSquare, square);
        setSelectedSquare(null);
        setLegalTargetSquares([]);
        return;
      }
    }

    const targets = getLegalMoves(square);
    if (targets.length > 0) {
      setSelectedSquare(square);
      setLegalTargetSquares(targets);
    } else {
      setSelectedSquare(null);
      setLegalTargetSquares([]);
    }
  };

  const handlePieceDrop = (sourceSquare: string, targetSquare: string) => {
    if (isGameOver || turn !== playerColor) return false;
    const move = makeMove(sourceSquare, targetSquare);
    setSelectedSquare(null);
    setLegalTargetSquares([]);
    return move !== null;
  };

  // Custom highlights for board squares
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Last move highlight
    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: 'rgba(250, 204, 21, 0.4)' };
      styles[lastMove.to] = { backgroundColor: 'rgba(250, 204, 21, 0.4)' };
    }

    // Selected square
    if (selectedSquare) {
      styles[selectedSquare] = { backgroundColor: 'rgba(34, 197, 94, 0.45)' };
    }

    // Legal move target dots / rings
    legalTargetSquares.forEach(sq => {
      styles[sq] = {
        background: 'radial-gradient(circle, rgba(34, 197, 94, 0.7) 25%, transparent 26%)',
        cursor: 'pointer'
      };
    });

    // Check indicator
    if (inCheck) {
      try {
        const c = new Chess(fen);
        // Find king square
        const board = c.board();
        for (let r = 0; r < 8; r++) {
          for (let col = 0; col < 8; col++) {
            const piece = board[r][col];
            if (piece && piece.type === 'k' && piece.color === turn) {
              const file = 'abcdefgh'[col];
              const rank = 8 - r;
              styles[`${file}${rank}`] = {
                background: 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.9) 0%, rgba(239, 68, 68, 0.4) 60%, transparent 85%)'
              };
            }
          }
        }
      } catch {}
    }

    return styles;
  }, [lastMove, selectedSquare, legalTargetSquares, inCheck, fen, turn]);

  // Display FEN (handles review ply)
  const displayFen = useMemo(() => {
    if (selectedPly === null || selectedPly >= sanMoves.length) return fen;
    try {
      const temp = new Chess();
      for (let i = 0; i <= selectedPly; i++) {
        temp.move(sanMoves[i]);
      }
      return temp.fen();
    } catch {
      return fen;
    }
  }, [selectedPly, sanMoves, fen]);

  const activeTheme = THEME_COLORS[boardTheme] || THEME_COLORS.emerald;

  return (
    <div className={darkMode ? 'dark' : ''}>
      <Head>
        <title>TwentyFish — Opponent-Adaptive Chess Engine</title>
        <meta name="description" content="Production-ready chess engine with 20 difficulty levels, live opponent style profiling, and adaptive move selection." />
      </Head>

      <main className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
        {/* Navigation Bar */}
        <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm">
                20
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight">TwentyFish</h1>
                <p className="text-[11px] text-neutral-500 font-medium">Opponent-Adaptive Engine & Clean UI</p>
              </div>
            </div>

            <ThemePicker
              boardTheme={boardTheme}
              onSelectTheme={setBoardTheme}
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
            />
          </div>
        </header>

        {/* Mobile Navigation Tabs (visible < lg) */}
        <div className="lg:hidden flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4">
          <button
            onClick={() => setMobileTab('board')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              mobileTab === 'board' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-neutral-500'
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setMobileTab('moves')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              mobileTab === 'moves' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-neutral-500'
            }`}
          >
            Moves ({sanMoves.length})
          </button>
          <button
            onClick={() => setMobileTab('profile')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              mobileTab === 'profile' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-neutral-500'
            }`}
          >
            Style Profile
          </button>
        </div>

        {/* Main 3-Column Layout */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Rail (Desktop: col-span-3) */}
            <div className={`lg:col-span-3 space-y-4 ${mobileTab !== 'board' ? 'hidden lg:block' : ''}`}>
              <EngineStats
                isThinking={isThinking}
                depth={depth}
                nodes={nodes}
                nps={nps}
                currentPv={currentPv}
                multiPvLines={multiPvLines}
                levelName={activeLevel.name}
              />
              <div className="hidden lg:block">
                <AdaptationPanel />
              </div>
            </div>

            {/* Center: Board & Clocks (Desktop: col-span-6) */}
            <div className={`lg:col-span-6 flex flex-col items-center justify-center space-y-3 ${mobileTab !== 'board' ? 'hidden lg:flex' : ''}`}>
              <ClockDisplay
                clock={clock}
                turn={turn}
                orientation={playerColor === 'w' ? 'white' : 'black'}
              />

              {/* Board + Side EvalBar Container */}
              <div className="relative flex items-center justify-center gap-3 w-full max-w-[520px]">
                {/* Vertical EvalBar */}
                <div className="h-[360px] sm:h-[480px]">
                  <EvalBar
                    evalCp={evalCp}
                    isMate={isMate}
                    mateIn={mateIn}
                    orientation={playerColor === 'w' ? 'white' : 'black'}
                  />
                </div>

                {/* Board */}
                <div className="flex-1 aspect-square rounded-xl overflow-hidden shadow-xl border-4 border-neutral-800 dark:border-neutral-700">
                  <Chessboard
                    id="main-twentyfish-board"
                    position={displayFen}
                    onPieceDrop={handlePieceDrop}
                    onSquareClick={handleSquareClick}
                    boardOrientation={playerColor === 'w' ? 'white' : 'black'}
                    customSquareStyles={customSquareStyles}
                    customDarkSquareStyle={{ backgroundColor: activeTheme.dark }}
                    customLightSquareStyle={{ backgroundColor: activeTheme.light }}
                    animationDuration={200}
                    arePiecesDraggable={!isGameOver && turn === playerColor && selectedPly === null}
                  />
                </div>
              </div>

              {/* Game Result Banner */}
              {isGameOver && (
                <div className="w-full max-w-[520px] p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center font-semibold text-amber-900 dark:text-amber-200 text-sm shadow-sm animate-fade-in">
                  {gameResult}
                </div>
              )}
            </div>

            {/* Right Rail (Desktop: col-span-3) */}
            <div className={`lg:col-span-3 space-y-4 ${mobileTab === 'board' ? 'hidden lg:block' : ''}`}>
              {/* On mobile, tab switches between Moves and Profile */}
              {mobileTab === 'moves' || typeof window !== 'undefined' && window.innerWidth >= 1024 ? (
                <>
                  <GameControls
                    activeLevelId={activeLevelId}
                    onSelectLevel={setActiveLevelId}
                    playerColor={playerColor}
                    onChangeSide={setPlayerColor}
                    onNewGame={() => {
                      resetGame();
                      resetEngineState();
                    }}
                    onUndo={undoMove}
                    onResign={resign}
                    onOfferDraw={offerDraw}
                    onExportPgn={getPgn}
                    onImportPgn={loadPgn}
                    onShareLink={() => {
                      if (typeof window === 'undefined') return '';
                      const u = new URL(window.location.href);
                      u.searchParams.set('fen', fen);
                      u.searchParams.set('level', activeLevelId.toString());
                      return u.toString();
                    }}
                  />

                  <MoveList
                    sanMoves={sanMoves}
                    selectedPly={selectedPly}
                    onSelectPly={selectPly}
                  />
                </>
              ) : null}

              {mobileTab === 'profile' && (
                <div className="lg:hidden">
                  <AdaptationPanel />
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
