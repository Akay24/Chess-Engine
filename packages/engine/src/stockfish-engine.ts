import { UciAdapter } from './uci-adapter';
import { LevelPreset } from './presets';
import EventEmitter from 'eventemitter3';

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

  /**
   * Creates a new StockfishEngine instance
   * @param workerPath Path to the Stockfish WASM worker
   */
  constructor(workerPath: string) {
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
    
    this.adapter.on('info', (info: any) => {
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
   * Applies a difficulty level preset to the engine
   * @param level Level preset to apply
   */
  applyLevel(level: LevelPreset): void {
    this.activeLevel = level;
    
    // Apply UCI options
    for (const [name, value] of Object.entries(level.uci)) {
      this.adapter.setOption(name, value);
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
   * Starts the search for the best move
   * @param options Optional search options to override level defaults
   * @returns Promise that resolves with the best move
   */
  async searchBestMove(options: { [key: string]: number } = {}): Promise<string> {
    if (!this.activeLevel) {
      throw new Error('No level preset applied');
    }
    
    if (this.isSearching) {
      this.adapter.stop();
    }
    
    this.isSearching = true;
    
    return new Promise((resolve) => {
      const searchParams: { [key: string]: number } = {};
      
      // Apply level search caps
      if (this.activeLevel.searchCaps.depth) {
        searchParams.depth = this.activeLevel.searchCaps.depth;
      }
      
      if (this.activeLevel.searchCaps.movetimeMs) {
        searchParams.movetime = this.activeLevel.searchCaps.movetimeMs;
      }
      
      if (this.activeLevel.searchCaps.nodes) {
        searchParams.nodes = this.activeLevel.searchCaps.nodes;
      }
      
      // Override with custom options
      Object.assign(searchParams, options);
      
      // Listen for best move (one-time event)
      this.once('bestmove', (bestMove: string) => {
        resolve(bestMove);
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
