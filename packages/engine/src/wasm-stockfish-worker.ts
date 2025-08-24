/**
 * Stockfish WASM worker implementation
 * This file runs in a Web Worker context and handles the communication with the Stockfish WASM module.
 */

// Web Worker context has self instead of window
const ctx: Worker = self as any;

// Stockfish WASM module
let stockfish: any;
let isInitialized = false;
let messageQueue: string[] = [];

// Initialize the Stockfish WASM module
async function initEngine() {
  try {
    // The Stockfish WASM module should export a function called 'Stockfish'
    if (typeof Stockfish !== 'function') {
      postMessage({ type: 'error', payload: 'Stockfish WASM module not loaded correctly' });
      return;
    }

    stockfish = await Stockfish();
    
    // Set up the output callback
    stockfish.addMessageListener((line: string) => {
      if (line.includes('uciok')) {
        postMessage({ type: 'ready', payload: 'uci' });
      } else if (line.includes('readyok')) {
        postMessage({ type: 'ready', payload: 'isready' });
      } else if (line.startsWith('bestmove')) {
        postMessage({ type: 'bestmove', payload: line });
      } else if (line.startsWith('info')) {
        postMessage({ type: 'info', payload: line });
      } else {
        postMessage({ type: 'log', payload: line });
      }
    });

    // Send initial UCI command
    stockfish.postMessage('uci');
    
    isInitialized = true;
    
    // Process any queued messages
    while (messageQueue.length > 0) {
      const message = messageQueue.shift();
      if (message) stockfish.postMessage(message);
    }

  } catch (error) {
    postMessage({ type: 'error', payload: `Failed to initialize Stockfish: ${error}` });
  }
}

// Handle messages from the main thread
ctx.onmessage = (event) => {
  const msg = event.data;
  
  switch (msg.type) {
    case 'init':
      initEngine();
      break;
    
    case 'setoption':
      const { name, value } = msg.payload;
      const command = `setoption name ${name} value ${value}`;
      if (isInitialized) {
        stockfish.postMessage(command);
      } else {
        messageQueue.push(command);
      }
      break;
    
    case 'position':
      const { fen, moves } = msg.payload;
      let command2 = `position fen ${fen}`;
      if (moves && moves.length > 0) {
        command2 += ` moves ${moves.join(' ')}`;
      }
      if (isInitialized) {
        stockfish.postMessage(command2);
      } else {
        messageQueue.push(command2);
      }
      break;
    
    case 'go':
      let command3 = 'go';
      for (const [key, value] of Object.entries(msg.payload || {})) {
        command3 += ` ${key} ${value}`;
      }
      if (isInitialized) {
        stockfish.postMessage(command3);
      } else {
        messageQueue.push(command3);
      }
      break;
    
    case 'stop':
      if (isInitialized) {
        stockfish.postMessage('stop');
      } else {
        messageQueue.push('stop');
      }
      break;
    
    case 'quit':
      if (isInitialized) {
        stockfish.postMessage('quit');
      }
      // Terminate the worker
      close();
      break;
    
    default:
      // For direct UCI commands
      if (typeof msg === 'string') {
        if (isInitialized) {
          stockfish.postMessage(msg);
        } else {
          messageQueue.push(msg);
        }
      }
  }
};

// Let the main thread know the worker is loaded
postMessage({ type: 'log', payload: 'Stockfish WASM worker initialized' });
