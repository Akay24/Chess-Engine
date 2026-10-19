/**
 * TwentyFish Stockfish Worker Wrapper
 * Loads real Stockfish WASM/JS engine via importScripts('/stockfish.js')
 * Provides UCI communication bridge with debug logging and MultiPV support.
 */

let debugMode = false;
let currentSkill = 20;
let currentMultiPv = 1;

// Intercept postMessage before Stockfish captures it
const rawPostMessage = self.postMessage.bind(self);

self.postMessage = function (msg) {
  if (debugMode && typeof msg === 'string') {
    console.log(`[UCI << L-Skill=${currentSkill} MultiPV=${currentMultiPv}] ${msg}`);
  }
  rawPostMessage(msg);
};

// Load real Stockfish engine
try {
  importScripts('/stockfish.js');
} catch (err) {
  console.error('Failed to load /stockfish.js in Web Worker:', err);
}

// Capture the onmessage handler that stockfish.js assigned
const stockfishHandler = self.onmessage;

self.onmessage = function (e) {
  const line = (typeof e.data === 'string' ? e.data : e.data?.type || '').trim();
  if (!line) return;

  if (line.startsWith('debug ')) {
    debugMode = line.split(' ')[1] === 'on' || line.split(' ')[1] === 'true';
    return;
  }

  if (line.includes('Skill Level')) {
    const parts = line.split(' ');
    const valIdx = parts.indexOf('value');
    if (valIdx !== -1) currentSkill = parseInt(parts[valIdx + 1], 10);
  }
  if (line.includes('MultiPV')) {
    const parts = line.split(' ');
    const valIdx = parts.indexOf('value');
    if (valIdx !== -1) currentMultiPv = parseInt(parts[valIdx + 1], 10);
  }

  if (debugMode) {
    console.log(`[UCI >> L-Skill=${currentSkill} MultiPV=${currentMultiPv}] ${line}`);
  }

  if (typeof stockfishHandler === 'function') {
    stockfishHandler(e);
  }
};
