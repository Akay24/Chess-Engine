import { UciAdapter, UciInfo, WorkerLike } from './uci-adapter';
import { LevelPreset } from './presets';
import EventEmitter from 'eventemitter3';
import { StyleVector, MoveRecord, extractStyleFeatures } from './adaptation/style-features';
import { StyleModel, HeuristicStyleModel, AdaptationPlan, PositionContext } from './adaptation/style-model';
import { CandidateMove, selectAdaptiveMove } from './adaptation/move-selector';

export interface AdaptationOptions {
  enabled: boolean;
  evalWindowCp?: number;
  multiPv?: number;
}

export interface StyleUpdateEvent {
  vector: StyleVector;
  plan: AdaptationPlan;
  status: string;
}

/**
 * Higher-level chess engine API for Stockfish
 */
export class StockfishEngine extends EventEmitter {
  private adapter: UciAdapter;
  private isReady: boolean = false;
  private isSearching: boolean = false;
  private currentFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  private currentMoves: string[] = [];
  private activeLevel: LevelPreset | null = null;
  public debug: boolean = false;

  public adaptationOptions: AdaptationOptions = { enabled: false, multiPv: 4 };
  public styleModel: StyleModel = new HeuristicStyleModel();
  public activeStyleVector: StyleVector | null = null;
  public activePlan: AdaptationPlan | null = null;
  private multiPvCandidates: Map<number, CandidateMove> = new Map();

  /**
   * Creates a new StockfishEngine instance
   * @param workerPath Path to the Stockfish WASM worker or a WorkerLike instance
   */
  constructor(workerPath: string | WorkerLike) {
    super();
    this.adapter = new UciAdapter(workerPath);
    
    // Forward events from the UCI adapter
    this.adapter.on('ready', () => {
      this.isReady = true;
      this.emit('ready');
    });
    
    this.adapter.on('bestmove', (bestMove: string) => {
      this.isSearching = false;
      this.emit('bestmove', bestMove);
    });
    
    this.adapter.on('info', (info: UciInfo) => {
      if (info.multipv && info.pv && info.pv.length > 0) {
        const uciMove = info.pv[0];
        let scoreCp = 0;
        if (info.score) {
          if (info.score.unit === 'mate') {
            scoreCp = info.score.value > 0 ? 30000 - info.score.value : -30000 - info.score.value;
          } else {
            scoreCp = info.score.value;
          }
        }

        this.multiPvCandidates.set(info.multipv, {
          multipv: info.multipv,
          uci: uciMove,
          scoreCp,
          depth: info.depth || 1,
          pv: info.pv
        });
      }
      this.emit('info', info);
    });
  }

  /**
   * Initializes the engine
   */
  async init(): Promise<void> {
    await this.adapter.init();
    return Promise.resolve();
  }

  /**
   * Enables or disables debug instrumentation logging
   */
  setDebug(enabled: boolean): void {
    this.debug = enabled;
    this.syncDebugState();
  }

  private syncDebugState(): void {
    this.adapter.debug = this.debug;
    this.adapter.debugTag = `L${this.activeLevel?.id ?? '?'}, adapt: ${this.adaptationOptions.enabled ? 'ON' : 'OFF'}`;
  }

  /**
   * Applies a difficulty level preset to the engine
   * @param level Level preset to apply
   */
  applyLevel(level: LevelPreset): void {
    this.activeLevel = level;
    this.syncDebugState();
    
    // Apply UCI options
    for (const [name, value] of Object.entries(level.uci)) {
      if (value !== undefined) {
        const optionName = name === 'Skill' ? 'Skill Level' : name;
        this.adapter.setOption(optionName, value);
      }
    }
    
    // Other engine settings can be applied here
    this.emit('levelChanged', level);
  }

  /**
   * Sets the current position
   * @param fen FEN string
   * @param moves Previous moves from the position
   */
  setPosition(fen: string, moves: string[] = []): void {
    this.currentFen = fen;
    this.currentMoves = [...moves];
    this.adapter.setPosition(fen, moves);
  }

  /**
   * Configures adaptive play settings
   */
  configureAdaptation(options: Partial<AdaptationOptions>): void {
    this.adaptationOptions = { ...this.adaptationOptions, ...options };
    this.syncDebugState();
    if (this.adaptationOptions.enabled) {
      this.adapter.setMultiPv(this.adaptationOptions.multiPv ?? 4);
    } else {
      this.adapter.setMultiPv(1);
    }
  }

  /**
   * Updates opponent style profile from game history and emits styleUpdate event
   */
  async updateOpponentStyle(moves: MoveRecord[], humanColor: 'w' | 'b'): Promise<StyleUpdateEvent> {
    const profile = extractStyleFeatures(moves, humanColor);
    this.activeStyleVector = profile.vector;

    const ctx: PositionContext = {
      fen: this.currentFen,
      ply: moves.length,
      isEngineWhite: humanColor === 'b',
      humanColor,
      eco: profile.eco,
      openingFamily: profile.openingFamily
    };

    const plan = await this.styleModel.plan(profile.vector, ctx);
    this.activePlan = plan;

    const eventPayload: StyleUpdateEvent = {
      vector: profile.vector,
      plan,
      status: plan.explanation
    };

    this.emit('styleUpdate', eventPayload);
    return eventPayload;
  }

  /**
   * Starts the search for the best move
   * @param options Optional search options to override level defaults
   * @returns Promise that resolves with the best move
   */
  async searchBestMove(options: { [key: string]: number } = {}): Promise<string> {
    const activeLevel = this.activeLevel;
    if (!activeLevel) {
      throw new Error('No level preset applied');
    }
    
    if (this.isSearching) {
      this.adapter.stop();
    }
    
    this.isSearching = true;
    this.multiPvCandidates.clear();

    if (this.adaptationOptions.enabled && activeLevel.id < 19) {
      this.adapter.setMultiPv(this.adaptationOptions.multiPv ?? 4);
    } else {
      this.adapter.setMultiPv(1);
    }
    
    return new Promise((resolve) => {
      const searchParams: { [key: string]: number } = {};
      
      // Apply level search caps
      if (activeLevel.searchCaps.depth) {
        searchParams.depth = activeLevel.searchCaps.depth;
      }
      
      if (activeLevel.searchCaps.movetimeMs) {
        searchParams.movetime = activeLevel.searchCaps.movetimeMs;
      }
      
      if (activeLevel.searchCaps.nodes) {
        searchParams.nodes = activeLevel.searchCaps.nodes;
      }
      
      // Override with custom options
      Object.assign(searchParams, options);
      
      // Listen for best move (one-time event)
      this.once('bestmove', (nativeBestMove: string) => {
        let finalMove = nativeBestMove;

        if (this.adaptationOptions.enabled && this.activePlan && this.multiPvCandidates.size > 0) {
          const sortedCandidates = Array.from(this.multiPvCandidates.values())
            .sort((a, b) => a.multipv - b.multipv);

          finalMove = selectAdaptiveMove(sortedCandidates, this.activePlan, activeLevel, {
            adaptationEnabled: true,
            evalWindowCp: this.adaptationOptions.evalWindowCp
          });
        }

        if (this.debug) {
          console.log(`[SEARCH RESULT] level=${activeLevel.id} adaptation=${this.adaptationOptions.enabled ? 'ON' : 'OFF'} engine_bestmove=${nativeBestMove} chosen_move=${finalMove} altered=${nativeBestMove !== finalMove}`);
        }

        resolve(finalMove);
      });
      
      // Start the search
      this.adapter.go(searchParams);
    });
  }

  /**
   * Analyzes the current position with infinite search
   * Note: Must be stopped manually with stopAnalysis()
   */
  startAnalysis(): void {
    if (this.isSearching) {
      this.adapter.stop();
    }
    
    this.isSearching = true;
    this.adapter.go({ infinite: 1 });
  }

  /**
   * Stops the current analysis or search
   */
  stopAnalysis(): void {
    if (this.isSearching) {
      this.adapter.stop();
      this.isSearching = false;
    }
  }

  /**
   * Sets a UCI option
   * @param name Option name
   * @param value Option value
   */
  setOption(name: string, value: string | number | boolean): void {
    this.adapter.setOption(name, value);
  }

  /**
   * Terminates the engine and cleans up resources
   */
  terminate(): void {
    this.stopAnalysis();
    this.adapter.quit();
  }
}
