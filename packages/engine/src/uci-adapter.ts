import EventEmitter from 'eventemitter3';

export interface UciOption {
  name: string;
  value: string | number | boolean;
}

export interface UciScore {
  unit: 'cp' | 'mate';
  value: number;
}

export interface UciInfo {
  depth?: number;
  seldepth?: number;
  time?: number;
  nodes?: number;
  nps?: number;
  hashfull?: number;
  pv?: string[];
  multipv?: number;
  score?: UciScore;
  currmove?: string;
  currmovenumber?: number;
  string?: string;
}

export interface EngineEvent {
  type: 'ready' | 'info' | 'bestmove' | 'error' | 'log';
  payload?: any;
}

export interface SearchLimits {
  depth?: number;
  nodes?: number;
  movetime?: number;
  wtime?: number;
  btime?: number;
  winc?: number;
  binc?: number;
  movestogo?: number;
  infinite?: boolean | number;
}

export interface WorkerLike {
  postMessage(message: any): void;
  onmessage?: any;
  terminate?: () => void;
}

export class UciAdapter extends EventEmitter {
  private worker: WorkerLike;
  private isReady: boolean = false;
  private initPromise: Promise<void> | null = null;
  public debug: boolean = false;
  public debugTag: string = 'default';

  constructor(workerOrPath: string | WorkerLike) {
    super();
    if (typeof workerOrPath === 'string') {
      if (typeof Worker !== 'undefined') {
        this.worker = new Worker(workerOrPath) as unknown as WorkerLike;
      } else {
        // Node.js environment worker_threads fallback
        try {
          const { Worker: NodeWorker } = require('worker_threads');
          const path = require('path');
          let sfPath = '';
          try {
            sfPath = require.resolve('stockfish.js/stockfish.js');
          } catch {
            sfPath = path.resolve(__dirname, '../../../../node_modules/.pnpm/stockfish.js@10.0.2/node_modules/stockfish.js/stockfish.js');
          }

          const workerCode = `
            const { parentPort } = require('worker_threads');
            global.self = global;
            global.postMessage = (msg) => parentPort.postMessage(msg);
            global.importScripts = () => {};
            global.location = { href: 'http://localhost/stockfish.js' };
            require('${sfPath}');
            parentPort.on('message', (msg) => {
              if (typeof global.onmessage === 'function') {
                global.onmessage({ data: msg });
              }
            });
          `;

          const nodeWorker = new NodeWorker(workerCode, { eval: true });
          const workerBridge: WorkerLike = {
            postMessage: (msg: any) => nodeWorker.postMessage(msg),
            terminate: () => nodeWorker.terminate()
          };
          nodeWorker.on('message', (msg: any) => {
            if (workerBridge.onmessage) workerBridge.onmessage({ data: msg } as any);
          });
          this.worker = workerBridge;
        } catch (e) {
          throw new Error(`Web Worker is not available and Node worker fallback failed: ${e}`);
        }
      }
    } else {
      this.worker = workerOrPath;
    }

    this.worker.onmessage = this.handleMessage.bind(this);
  }

  private handleMessage(e: MessageEvent | { data: any }) {
    const message = (typeof e.data === 'string' ? e.data : '') as string;
    
    if (this.debug) {
      console.log(`[UCI << ${this.debugTag}] ${message}`);
    }

    if (message.includes('readyok')) {
      this.isReady = true;
      this.emit('ready');
    } 
    else if (message.includes('bestmove')) {
      const bestMove = message.split(' ')[1];
      this.emit('bestmove', bestMove);
    }
    else if (message.includes('info')) {
      const info = UciAdapter.parseInfo(message);
      this.emit('info', info);
    }
  }

  public static parseInfo(infoLine: string): UciInfo {
    const info: UciInfo = {};
    const parts = infoLine.split(' ');
    
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      
      if (part === 'depth' && i + 1 < parts.length) {
        info.depth = parseInt(parts[++i]);
      }
      else if (part === 'seldepth' && i + 1 < parts.length) {
        info.seldepth = parseInt(parts[++i]);
      }
      else if (part === 'multipv' && i + 1 < parts.length) {
        info.multipv = parseInt(parts[++i]);
      }
      else if (part === 'time' && i + 1 < parts.length) {
        info.time = parseInt(parts[++i]);
      }
      else if (part === 'nodes' && i + 1 < parts.length) {
        info.nodes = parseInt(parts[++i]);
      }
      else if (part === 'nps' && i + 1 < parts.length) {
        info.nps = parseInt(parts[++i]);
      }
      else if (part === 'score' && i + 2 < parts.length) {
        const unit = parts[++i] as 'cp' | 'mate';
        const value = parseInt(parts[++i]);
        info.score = { unit, value };
      }
      else if (part === 'pv') {
        const pv: string[] = [];
        i++;
        while (i < parts.length && !parts[i].includes('bmc')) {
          pv.push(parts[i++]);
        }
        i--;
        info.pv = pv;
      }
    }
    
    return info;
  }

  public async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = new Promise<void>((resolve) => {
      this.once('ready', () => resolve());
      this.send('uci');
      this.send('isready');
    });
    
    return this.initPromise;
  }

  public send(command: string): void {
    if (this.debug) {
      console.log(`[UCI >> ${this.debugTag}] ${command}`);
    }
    this.worker.postMessage(command);
  }

  public setOption(name: string, value: string | number | boolean): void {
    this.send(`setoption name ${name} value ${value}`);
  }

  public setMultiPv(count: number): void {
    this.setOption('MultiPV', count);
  }

  public setPosition(fen: string, moves: string[] = []): void {
    let command = `position fen ${fen}`;
    if (moves.length > 0) {
      command += ` moves ${moves.join(' ')}`;
    }
    this.send(command);
  }

  public go(limits: SearchLimits = {}): void {
    let command = 'go';
    
    if (limits.infinite) command += ' infinite';
    if (limits.depth) command += ` depth ${limits.depth}`;
    if (limits.nodes) command += ` nodes ${limits.nodes}`;
    if (limits.movetime) command += ` movetime ${limits.movetime}`;
    if (limits.wtime) command += ` wtime ${limits.wtime}`;
    if (limits.btime) command += ` btime ${limits.btime}`;
    if (limits.winc) command += ` winc ${limits.winc}`;
    if (limits.binc) command += ` binc ${limits.binc}`;
    if (limits.movestogo) command += ` movestogo ${limits.movestogo}`;
    
    this.send(command);
  }

  public stop(): void {
    this.send('stop');
  }

  public quit(): void {
    this.send('quit');
    this.worker.terminate?.();
  }
}
