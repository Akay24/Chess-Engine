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
}

export class UciAdapter extends EventEmitter {
  private worker: Worker;
  private isReady: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(workerPath: string) {
    super();
    this.worker = new Worker(workerPath);
    this.worker.onmessage = this.handleMessage.bind(this);
  }

  private handleMessage(e: MessageEvent) {
    const message = e.data as string;
    
    if (message.includes('readyok')) {
      this.isReady = true;
      this.emit('ready');
    } 
    else if (message.includes('bestmove')) {
      const bestMove = message.split(' ')[1];
      this.emit('bestmove', bestMove);
    }
    else if (message.includes('info')) {
      const info = this.parseInfo(message);
      this.emit('info', info);
    }
  }

  private parseInfo(infoLine: string): UciInfo {
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
    this.worker.postMessage(command);
  }

  public setOption(name: string, value: string | number | boolean): void {
    this.send(`setoption name ${name} value ${value}`);
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
    this.worker.terminate();
  }
}
