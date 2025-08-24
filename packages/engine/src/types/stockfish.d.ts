declare var Stockfish: () => Promise<{
  addMessageListener: (callback: (line: string) => void) => void;
  postMessage: (command: string) => void;
  terminate: () => void;
}>;

interface WorkerGlobalScope {
  Stockfish: typeof Stockfish;
}
