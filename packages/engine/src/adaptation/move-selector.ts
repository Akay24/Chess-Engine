import { Chess } from 'chess.js';
import { AdaptationPlan } from './style-model';
import { LevelPreset } from '../presets';

export interface CandidateMove {
  multipv: number;
  uci: string;
  san?: string;
  scoreCp: number;
  depth: number;
  pv: string[];
}

export interface MoveSelectionOptions {
  adaptationEnabled: boolean;
  evalWindowCp?: number;
  multiPv?: number;
  rngSeed?: number;
}

export const LEVEL_EVAL_WINDOWS: Record<number, number> = {
  1: 100,
  2: 80,
  3: 60,
  4: 50,
  5: 40,
  6: 30,
  7: 25,
  8: 20,
  9: 15,
  10: 12,
  11: 10,
  12: 8,
  13: 6,
  14: 5,
  15: 4,
  16: 3,
  17: 2,
  18: 1,
  19: 0,
  20: 0
};

/**
 * Deterministic pseudo-random generator (Mulberry32) for reproducible tests.
 */
function createPrng(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Evaluates candidate move heuristic fit against the AdaptationPlan.
 * Produces a bounded bonus in [-15, +15] cp.
 */
export function scoreCandidateByPlan(
  cand: CandidateMove,
  plan: AdaptationPlan,
  fen?: string
): number {
  let bonus = 0;
  const san = cand.san || '';

  // Checks and forcing moves
  const isCheck = san.includes('+') || san.includes('#');
  if (isCheck) {
    bonus += plan.weights.tacticalSharpness * 8;
  }

  // Captures and trades
  const isCapture = san.includes('x');
  if (isCapture) {
    bonus += plan.weights.pieceTrades * 10;
  } else {
    // Non-captures when piece trades are discouraged maintain tension
    bonus -= plan.weights.pieceTrades * 4;
  }

  // Castling & King Defense
  const isCastling = san === 'O-O' || san === 'O-O-O';
  if (isCastling) {
    bonus += plan.weights.kingDefense * 8;
  }

  // Pawn structure preferences
  const isPawnMove = !/^[NBRQK]/.test(san);
  if (isPawnMove) {
    if (plan.preferredStructure === 'closed') {
      bonus += plan.weights.closedPosition * 6;
    } else if (plan.preferredStructure === 'open') {
      bonus -= plan.weights.closedPosition * 6;
    }
  }

  return Math.max(-15, Math.min(15, bonus));
}

/**
 * Selects an adaptive move from MultiPV candidate lines.
 * 
 * ORDER OF OPERATIONS:
 * 1. MultiPV Candidate Collection (lines sorted by engine score)
 * 2. Absolute Best & Forced Mate Check:
 *    - If adaptation is OFF, or level >= 19, or only 1 move available, or forced mate (|score| >= 20000):
 *      return candidate 1 (objective best move).
 * 3. Eval Window Filter (HARD CONSTRAINT):
 *    - Window is determined by level (LEVEL_EVAL_WINDOWS) or custom override.
 *    - All candidates with scoreCp < bestScore - window are strictly disqualified.
 * 4. Style-Biased Re-ranking:
 *    - Score remaining candidates = scoreCp + styleBonus(candidate, plan).
 *    - Sort descending.
 * 5. Stochastic Mistake Injection:
 *    - If level.stochasticity?.enable and RNG < mistakeRate:
 *      pick lowest-scoring candidate strictly within the filtered window.
 * 
 * @returns The chosen move's UCI string.
 */
export function selectAdaptiveMove(
  candidates: CandidateMove[],
  plan: AdaptationPlan,
  level: LevelPreset,
  options: MoveSelectionOptions = { adaptationEnabled: false }
): string {
  if (!candidates || candidates.length === 0) {
    throw new Error('Candidate moves list cannot be empty');
  }

  // Find the true maximum scoring candidate regardless of initial ordering
  let bestCandidate = candidates[0];
  let maxScore = bestCandidate.scoreCp;
  for (const c of candidates) {
    if (c.scoreCp > maxScore) {
      maxScore = c.scoreCp;
      bestCandidate = c;
    }
  }

  // 1. Levels 19-20, adaptation disabled, or single candidate -> strictly best move
  if (
    !options.adaptationEnabled ||
    level.id >= 19 ||
    candidates.length === 1
  ) {
    return bestCandidate.uci;
  }

  // 2. Forced mate check: no re-ranking when mate is on the board
  if (Math.abs(bestCandidate.scoreCp) >= 20000) {
    return bestCandidate.uci;
  }

  // 3. Eval Window Filter (Hard Constraint)
  const windowCp = options.evalWindowCp !== undefined
    ? options.evalWindowCp
    : (LEVEL_EVAL_WINDOWS[level.id] ?? level.stochasticity?.evalWindowCp ?? 30);

  if (windowCp <= 0) {
    return bestCandidate.uci;
  }

  const bestScore = maxScore;
  const eligible = candidates.filter(c => c.scoreCp >= bestScore - windowCp);

  // Guarantee that the best candidate is always present in eligible
  if (!eligible.some(c => c.uci === bestCandidate.uci)) {
    eligible.unshift(bestCandidate);
  }

  if (eligible.length <= 1) {
    return bestCandidate.uci;
  }

  // 4. Style-Biased Re-ranking
  const scoredCandidates = eligible.map(cand => {
    const styleFit = scoreCandidateByPlan(cand, plan);
    // Combine objective engine score with style preference
    const compositeScore = cand.scoreCp + styleFit;
    return { cand, compositeScore };
  });

  scoredCandidates.sort((a, b) => b.compositeScore - a.compositeScore);

  // 5. Stochastic Mistake Injection
  const prng = options.rngSeed !== undefined ? createPrng(options.rngSeed) : Math.random;
  const mistakeRate = level.stochasticity?.enable ? (level.stochasticity.mistakeRate ?? 0) : 0;

  if (mistakeRate > 0 && prng() < mistakeRate) {
    // Pick from lower end of the allowed window, NEVER outside the eligible set
    return eligible[eligible.length - 1].uci;
  }

  return scoredCandidates[0].cand.uci;
}
