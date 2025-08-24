/**
 * Stockfish WASM worker wrapper
 * This provides a class to interact with the Stockfish WASM worker
 */

export type WorkerMessage = {
  type: 'init' | 'setoption' | 'position' | 'go' | 'stop' | 'quit';
  payload?: any;
};

export type WorkerResponse = {
  type: 'ready' | 'info' | 'bestmove' | 'error' | 'log';
  payload?: any;
};

export class StockfishWorker {
  private worker: Worker;
  private messageHandlers: Map<string, ((response: WorkerResponse) => void)[]> = new Map();
  private isInitialized: boolean = false;

  /**
   * Creates a new StockfishWorker
   * @param wasmPath Path to the Stockfish WASM worker script
   */
  constructor(wasmPath: string) {
    this.worker = new Worker(wasmPath);
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
  }

  /**
   * Initializes the Stockfish engine
   * @returns Promise that resolves when the engine is ready
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const onReady = (response: WorkerResponse) => {
        if (response.type === 'ready') {
          this.isInitialized = true;
          this.off('ready', onReady);
          resolve();
        }
      };

      this.on('ready', onReady);
      this.on('error', (response) => {
        reject(response.payload);
      });

      this.postMessage({ type: 'init' });
    });
  }

  /**
   * Sets a UCI option in the engine
   * @param name Option name
   * @param value Option value
   */
  setOption(name: string, value: string | number | boolean): void {
    this.postMessage({
      type: 'setoption',
      payload: { name, value }
    });
  }

  /**
   * Sets the position on the engine's board
   * @param fen FEN string of the position
   * @param moves Optional array of moves to apply after the FEN
   */
  setPosition(fen: string, moves: string[] = []): void {
    this.postMessage({
      type: 'position',
      payload: { fen, moves }
    });
  }

  /**
   * Starts the engine search
   * @param options Search options (depth, movetime, etc.)
   */
  go(options: { [key: string]: any } = {}): void {
    this.postMessage({
      type: 'go',
      payload: options
    });
  }

  /**
   * Stops the current search
   */
  stop(): void {
    this.postMessage({ type: 'stop' });
  }

  /**
   * Terminates the worker
   */
  terminate(): void {
    this.postMessage({ type: 'quit' });
    this.worker.terminate();
  }

  /**
   * Posts a message to the worker
   * @param msg Message to post
   */
  private postMessage(msg: WorkerMessage): void {
    this.worker.postMessage(msg);
  }

  /**
   * Handles messages from the worker
   * @param event MessageEvent from the worker
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const response = event.data as WorkerResponse;
    
    // Call all registered handlers for this message type
    const handlers = this.messageHandlers.get(response.type) || [];
    handlers.forEach(handler => handler(response));
  }

  /**
   * Registers an event handler
   * @param type Event type
   * @param handler Event handler
   */
  on(type: string, handler: (response: WorkerResponse) => void): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * Removes an event handler
   * @param type Event type
   * @param handler Event handler to remove
   */
  off(type: string, handler: (response: WorkerResponse) => void): void {
    if (!this.messageHandlers.has(type)) return;
    
    const handlers = this.messageHandlers.get(type)!;
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
}
