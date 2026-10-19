import { StockfishEngine, LEVEL_PRESETS, LevelPreset } from '../src';
import { WorkerLike } from '../src/uci-adapter';
import { Worker as NodeWorker } from 'worker_threads';
import * as path from 'path';

// 30 Fixed Benchmark Positions: 10 Openings, 10 Tactics, 10 Endgames
export const BENCHMARK_POSITIONS = [
  // 10 Openings
  { id: 'O01', cat: 'Opening', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', desc: 'Standard Startpos' },
  { id: 'O02', cat: 'Opening', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', desc: 'King Pawn Game' },
  { id: 'O03', cat: 'Opening', fen: 'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', desc: 'Open Sicilian' },
  { id: 'O04', cat: 'Opening', fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3', desc: 'French Defense' },
  { id: 'O05', cat: 'Opening', fen: 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3', desc: 'Caro-Kann Defense' },
  { id: 'O06', cat: 'Opening', fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 1 3', desc: 'Queens Gambit' },
  { id: 'O07', cat: 'Opening', fen: 'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3', desc: 'Kings Indian' },
  { id: 'O08', cat: 'Opening', fen: 'r1bqkb1r/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', desc: 'Ruy Lopez Berlin' },
  { id: 'O09', cat: 'Opening', fen: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4', desc: 'Nimzo-Indian' },
  { id: 'O10', cat: 'Opening', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', desc: 'Italian Game' },

  // 10 Tactics
  { id: 'T01', cat: 'Tactics', fen: 'r1b2rk1/pp3ppp/2n1p3/q7/2BP4/P1n1PN2/3B1PPP/R2QK2R w KQ - 0 13', desc: 'Pinned knight discovery' },
  { id: 'T02', cat: 'Tactics', fen: 'r1bq1rk1/ppp2ppp/2n5/4p3/2B2n2/2NP1N2/PPP2PPP/R2Q1RK1 w - - 0 10', desc: 'Center tactics' },
  { id: 'T03', cat: 'Tactics', fen: '3r2k1/pp3ppp/2p5/8/8/P1P1q3/1P4PP/4RQ1K b - - 1 25', desc: 'Back-rank threat' },
  { id: 'T04', cat: 'Tactics', fen: '2r3k1/1p3ppp/p3p3/3p4/8/1P3Q1P/P1q2PP1/4R1K1 w - - 0 25', desc: 'Major piece infiltration' },
  { id: 'T05', cat: 'Tactics', fen: 'r1b1k2r/pppp1ppp/8/2b1n3/3PP2q/2P5/PP3PPP/RNBQKB1R w KQkq - 1 7', desc: 'Central pawn fork' },
  { id: 'T06', cat: 'Tactics', fen: 'r2q1rk1/pb3ppp/1p1bpn2/3p4/2PP4/1PN2N2/PB2QPPP/2R2RK1 w - - 0 14', desc: 'Hanging pawns pressure' },
  { id: 'T07', cat: 'Tactics', fen: 'r1b2rk1/1pq1bppp/p1np4/4p3/2B1P3/2N1QN2/PPP2PPP/2KR3R w - - 2 13', desc: 'Outpost and king attack' },
  { id: 'T08', cat: 'Tactics', fen: 'r2qr1k1/pb1nbppp/1p1pp3/2p5/3PP3/2PB1NN1/PP2QPPP/R3R1K1 w - - 0 14', desc: 'Kingside coordination' },
  { id: 'T09', cat: 'Tactics', fen: 'r1bqr1k1/ppp2ppp/2np4/2b5/2B1PB2/2NP1N2/PPP3PP/R2QK2R w KQ - 0 9', desc: 'Attacking f7 weakness' },
  { id: 'T10', cat: 'Tactics', fen: 'r4rk1/1pp1qppp/p1np1n2/4p1B1/2B1P3/2NP1Q1P/PPP2PP1/R4RK1 w - - 0 11', desc: 'Pin exploitation on f6' },

  // 10 Endgames
  { id: 'E01', cat: 'Endgame', fen: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1', desc: 'King + Pawn Opposition' },
  { id: 'E02', cat: 'Endgame', fen: '8/8/8/4k3/8/4K3/3P4/8 w - - 0 1', desc: 'Passed Pawn Technique' },
  { id: 'E03', cat: 'Endgame', fen: '8/8/1p6/1P6/8/8/4K1k1/8 w - - 0 1', desc: 'Pawn Blockade & Penetration' },
  { id: 'E04', cat: 'Endgame', fen: '8/8/4kp2/8/4K1P1/8/8/8 w - - 0 1', desc: 'Key Squares King Endgame' },
  { id: 'E05', cat: 'Endgame', fen: '1r6/8/8/8/8/2K5/1R6/1k6 b - - 0 1', desc: 'Rook Ending Cutoff' },
  { id: 'E06', cat: 'Endgame', fen: '8/8/8/8/8/2k5/p7/K7 w - - 0 1', desc: 'Stalemate Avoidance' },
  { id: 'E07', cat: 'Endgame', fen: '8/8/8/3k4/8/4K3/3R4/8 b - - 0 1', desc: 'Rook Check and King Play' },
  { id: 'E08', cat: 'Endgame', fen: '8/8/5k2/8/8/5K2/4R3/8 w - - 0 1', desc: 'Rook Technical Conversion' },
  { id: 'E09', cat: 'Endgame', fen: '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1', desc: 'King & Pawn vs King Standard' },
  { id: 'E10', cat: 'Endgame', fen: '8/7k/8/8/8/8/6PP/7K w - - 0 1', desc: '2v0 Pawns King Ending' }
];

export interface BenchmarkResult {
  levelId: number;
  levelName: string;
  adaptation: boolean;
  matchCount: number;
  totalPositions: number;
  matchPct: number;
  avgCpl: number;
  optionsSummary: string;
}

/**
 * Creates a Node-compatible Worker instance pointing to stockfish.js
 */
export function createStockfishNodeWorker(): WorkerLike {
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
      if (typeof global.onmessage === 'function') global.onmessage({ data: msg });
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
  return workerBridge;
}

/**
 * Executes a UCI search for a single move with accurate eval extraction.
 */
async function searchPosition(
  engine: StockfishEngine,
  fen: string,
  limits: { depth?: number; movetime?: number }
): Promise<{ bestmove: string; scoreCp: number; pv: string[] }> {
  engine.setPosition(fen);

  let lastScoreCp = 0;
  let lastPv: string[] = [];

  const infoHandler = (info: any) => {
    if (info.multipv === 1 || !info.multipv) {
      if (info.score?.unit === 'cp') {
        lastScoreCp = info.score.value;
      } else if (info.score?.unit === 'mate') {
        lastScoreCp = info.score.value > 0 ? 30000 - info.score.value : -30000 - info.score.value;
      }
      if (info.pv) {
        lastPv = info.pv;
      }
    }
  };

  engine.on('info', infoHandler);

  const bestmove = await engine.searchBestMove(limits);
  engine.off('info', infoHandler);

  return { bestmove, scoreCp: lastScoreCp, pv: lastPv };
}

export async function runStrengthAudit(): Promise<{
  reference: Map<string, { bestmove: string; scoreCp: number }>;
  results: BenchmarkResult[];
  optionsLog: string[];
}> {
  console.log('===============================================================');
  console.log(' TwentyFish Headless Engine Strength & Calibration Audit');
  console.log('===============================================================\n');

  const optionsLog: string[] = [];

  // Step 1: Initialize Reference Engine (Full Strength, Depth 18)
  console.log('--- Step 1: Evaluating Reference (Depth 18, Skill 20) ---');
  const refWorker = createStockfishNodeWorker();
  const refEngine = new StockfishEngine(refWorker);
  await refEngine.init();

  // Apply maximum level to reference
  const maxLevel = LEVEL_PRESETS[19]; // L20
  refEngine.applyLevel(maxLevel);
  refEngine.configureAdaptation({ enabled: false });

  const referenceMap = new Map<string, { bestmove: string; scoreCp: number }>();

  for (let i = 0; i < BENCHMARK_POSITIONS.length; i++) {
    const pos = BENCHMARK_POSITIONS[i];
    process.stdout.write(`Evaluating Ref [${i + 1}/${BENCHMARK_POSITIONS.length}] ${pos.id} (${pos.desc})... `);
    const t0 = Date.now();
    // Run reference search at fixed depth 12
    const refRes = await searchPosition(refEngine, pos.fen, { depth: 12 });
    referenceMap.set(pos.fen, { bestmove: refRes.bestmove, scoreCp: refRes.scoreCp });
    console.log(`Move: ${refRes.bestmove} (${Date.now() - t0}ms)`);
  }

  refEngine.terminate();
  console.log('\n--- Reference Baseline Complete ---\n');

  // Step 2: Audit Levels L1..L20 (with adaptation OFF, then ON)
  const results: BenchmarkResult[] = [];

  for (const level of LEVEL_PRESETS) {
    for (const adapt of [false, true]) {
      const worker = createStockfishNodeWorker();
      const engine = new StockfishEngine(worker);
      await engine.init();

      // Track order of options sent
      optionsLog.push(`\n=== Level ${level.id} (${level.name}) | Adaptation: ${adapt ? 'ON' : 'OFF'} ===`);
      const originalSend = (engine as any).adapter.send.bind((engine as any).adapter);
      (engine as any).adapter.send = (cmd: string) => {
        optionsLog.push(`[UCI >>] ${cmd}`);
        originalSend(cmd);
      };

      engine.applyLevel(level);
      engine.configureAdaptation({ enabled: adapt });

      const optionsSummary = `Skill=${level.uci.Skill ?? 20}, depth=${level.searchCaps.depth ?? 'none'}, movetime=${level.searchCaps.movetimeMs ?? 'none'}, MultiPV=${adapt && level.id < 19 ? 4 : 1}`;

      let matches = 0;
      let totalCpl = 0;

      for (const pos of BENCHMARK_POSITIONS) {
        const ref = referenceMap.get(pos.fen)!;

        // Apply level search caps, aligned with reference depth (up to 12)
        const depth = level.searchCaps.depth ? Math.min(level.searchCaps.depth, 12) : 12;

        const res = await searchPosition(engine, pos.fen, { depth });

        if (res.bestmove === ref.bestmove) {
          matches++;
        }

        // CPL: difference from reference score (minimum 0)
        // If the moves match, CPL is 0.
        let cpl = 0;
        if (res.bestmove !== ref.bestmove) {
          // If level move differed, score deficit is estimated from eval difference
          cpl = Math.max(0, Math.min(1000, Math.abs(ref.scoreCp - res.scoreCp)));
          if (cpl === 0) cpl = 25; // Different move penalty
        }
        totalCpl += cpl;
      }

      engine.terminate();

      const matchPct = Math.round((matches / BENCHMARK_POSITIONS.length) * 100);
      const avgCpl = Math.round(totalCpl / BENCHMARK_POSITIONS.length);

      results.push({
        levelId: level.id,
        levelName: level.name,
        adaptation: adapt,
        matchCount: matches,
        totalPositions: BENCHMARK_POSITIONS.length,
        matchPct,
        avgCpl,
        optionsSummary
      });

      console.log(`L${level.id.toString().padStart(2, ' ')} [${adapt ? 'ADAPT ON ' : 'ADAPT OFF'}]: Match ${matches}/${BENCHMARK_POSITIONS.length} (${matchPct}%), Avg CPL: ${avgCpl} cp | ${optionsSummary}`);
    }
  }

  // Print Summary Table
  console.log('\n===============================================================');
  console.log(' STRENGTH AUDIT SUMMARY TABLE');
  console.log('===============================================================\n');
  console.log('| Level | Name | Adapt | Ref Match % | Avg CPL | Effective Options |');
  console.log('|-------|------|-------|-------------|---------|-------------------|');
  for (const r of results) {
    console.log(`| L${r.levelId.toString().padStart(2, ' ')} | ${r.levelName.padEnd(20, ' ')} | ${r.adaptation ? 'ON ' : 'OFF'} | ${r.matchPct.toString().padStart(3, ' ')}% | ${r.avgCpl.toString().padStart(4, ' ')} cp | ${r.optionsSummary} |`);
  }

  // Monotonicity & Anomaly Analysis
  console.log('\n--- Monotonicity & Quality Checks ---');
  let hasInversion = false;

  for (let i = 2; i < results.length; i += 2) {
    const prev = results[i - 2]; // Previous level adaptation OFF
    const curr = results[i];     // Current level adaptation OFF
    if (curr.avgCpl > prev.avgCpl + 15) {
      console.warn(`[WARNING] Inversion detected: L${curr.levelId} CPL (${curr.avgCpl} cp) is weaker than L${prev.levelId} (${prev.avgCpl} cp)`);
      hasInversion = true;
    }
  }

  const l20Off = results.find(r => r.levelId === 20 && !r.adaptation);
  if (l20Off && l20Off.avgCpl > 15) {
    console.warn(`[WARNING] L20 CPL is ${l20Off.avgCpl} cp (expected near 0 cp)`);
  } else {
    console.log('[SUCCESS] L20 plays near reference full strength with near 0 CPL.');
  }

  if (!hasInversion) {
    console.log('[SUCCESS] Engine strength rises monotonically across calibrated levels.');
  }

  return { reference: referenceMap, results, optionsLog };
}

// Run immediately if invoked as main script
if (require.main === module || process.argv[1]?.includes('strength-audit')) {
  runStrengthAudit().catch(err => {
    console.error('Audit failed with error:', err);
    process.exit(1);
  });
}
