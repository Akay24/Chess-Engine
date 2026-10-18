import { Chess, Move, PieceSymbol, Square } from 'chess.js';

export interface StyleDimension {
  /** Normalized value in [0, 1]. Neutral baseline is 0.5. */
  value: number;
  /** Confidence in [0, 1] scaling with sample size (moves observed). */
  confidence: number;
}

export interface MoveRecord {
  san: string;
  uci: string;
  color: 'w' | 'b';
  fenBefore: string;
  fenAfter: string;
  timeSpentMs?: number;
  clockRemainingMs?: number;
  evalBeforeCp?: number; // eval from player's perspective
  evalAfterCp?: number;  // eval from player's perspective
}

export interface StyleVector {
  aggression: StyleDimension;
  tactical: StyleDimension;
  openness: StyleDimension;
  kingSafety: StyleDimension;
  blunderRate: StyleDimension;
  timePressure?: StyleDimension;
}

export interface StyleProfile {
  movesCount: number;
  vector: StyleVector;
  eco?: string;
  openingName?: string;
  openingFamily?: string;
}

// Compact common ECO repertoire table for early game opening classification
interface EcoEntry {
  moves: string[]; // sequence of SAN moves
  eco: string;
  name: string;
  family: string;
}

const COMMON_ECO_ENTRIES: EcoEntry[] = [
  // A Family - Flank Openings
  { moves: ['c4', 'e5'], eco: 'A20', name: 'English Opening: King\'s English', family: 'A' },
  { moves: ['c4', 'c5'], eco: 'A30', name: 'English Opening: Symmetrical', family: 'A' },
  { moves: ['c4'], eco: 'A10', name: 'English Opening', family: 'A' },
  { moves: ['Nf3', 'd5', 'g3'], eco: 'A07', name: 'King\'s Indian Attack', family: 'A' },
  { moves: ['Nf3'], eco: 'A04', name: 'Reti Opening', family: 'A' },

  // B Family - Semi-Open Games (excluding 1...e5)
  { moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'], eco: 'B90', name: 'Sicilian: Najdorf', family: 'B' },
  { moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4'], eco: 'B32', name: 'Sicilian: Open', family: 'B' },
  { moves: ['e4', 'c5'], eco: 'B20', name: 'Sicilian Defense', family: 'B' },
  { moves: ['e4', 'c6', 'd4', 'd5'], eco: 'B12', name: 'Caro-Kann Defense', family: 'B' },
  { moves: ['e4', 'c6'], eco: 'B10', name: 'Caro-Kann Defense', family: 'B' },
  { moves: ['e4', 'd6'], eco: 'B07', name: 'Pirc Defense', family: 'B' },
  { moves: ['e4', 'Nf6'], eco: 'B02', name: 'Alekhine Defense', family: 'B' },
  { moves: ['e4', 'd5'], eco: 'B01', name: 'Scandinavian Defense', family: 'B' },

  // C Family - Open Games (1. e4 e5) & French
  { moves: ['e4', 'e6', 'd4', 'd5'], eco: 'C02', name: 'French Defense', family: 'C' },
  { moves: ['e4', 'e6'], eco: 'C00', name: 'French Defense', family: 'C' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], eco: 'C60', name: 'Ruy Lopez', family: 'C' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'], eco: 'C55', name: 'Two Knights Defense', family: 'C' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'], eco: 'C50', name: 'Italian Game: Giuoco Piano', family: 'C' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], eco: 'C50', name: 'Italian Game', family: 'C' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'], eco: 'C44', name: 'Scotch Game', family: 'C' },
  { moves: ['e4', 'e5', 'Nf3', 'Nf6'], eco: 'C42', name: 'Petrov Defense', family: 'C' },
  { moves: ['e4', 'e5', 'f4'], eco: 'C30', name: 'King\'s Gambit', family: 'C' },
  { moves: ['e4', 'e5'], eco: 'C20', name: 'Open Game', family: 'C' },

  // D Family - Closed Games & Semi-Closed (1. d4 d5, Grunfeld)
  { moves: ['d4', 'd5', 'c4', 'e6'], eco: 'D30', name: 'Queen\'s Gambit Declined', family: 'D' },
  { moves: ['d4', 'd5', 'c4', 'c6'], eco: 'D10', name: 'Slav Defense', family: 'D' },
  { moves: ['d4', 'd5', 'c4', 'dxc4'], eco: 'D20', name: 'Queen\'s Gambit Accepted', family: 'D' },
  { moves: ['d4', 'd5', 'c4'], eco: 'D06', name: 'Queen\'s Gambit', family: 'D' },
  { moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'], eco: 'D02', name: 'London System', family: 'D' },
  { moves: ['d4', 'd5'], eco: 'D00', name: 'Queen\'s Pawn Game', family: 'D' },
  { moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'], eco: 'D80', name: 'Grunfeld Defense', family: 'D' },

  // E Family - Indian Defenses
  { moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'], eco: 'E20', name: 'Nimzo-Indian Defense', family: 'E' },
  { moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'], eco: 'E12', name: 'Queen\'s Indian Defense', family: 'E' },
  { moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'], eco: 'E70', name: 'King\'s Indian Defense', family: 'E' },
  { moves: ['d4', 'Nf6', 'c4', 'g6'], eco: 'E60', name: 'King\'s Indian Defense', family: 'E' },
  { moves: ['d4', 'Nf6', 'c4', 'c5', 'd5'], eco: 'A56', name: 'Benoni Defense', family: 'A' },
  { moves: ['d4', 'Nf6'], eco: 'A45', name: 'Indian Defense', family: 'A' }
];

/**
 * Calculates confidence based on sample size (moves count) using an asymptotic curve.
 * 0 moves -> 0.0 confidence
 * 5 moves -> ~0.39 confidence
 * 10 moves -> ~0.63 confidence
 * 20 moves -> ~0.86 confidence
 * 30 moves -> ~0.95 confidence
 */
export function calculateConfidence(sampleSize: number, halfConfidenceK: number = 8): number {
  if (sampleSize <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - Math.exp(-sampleSize / halfConfidenceK)));
}

/**
 * Dampens a raw feature value towards neutral (0.5) when confidence is low,
 * preventing wild early-game swings.
 */
export function blendWithNeutral(raw: number, confidence: number): number {
  const neutral = 0.5;
  const clampedRaw = Math.min(1, Math.max(0, raw));
  return neutral * (1 - confidence) + clampedRaw * confidence;
}

/**
 * Identify opening from move sequence.
 */
export function identifyOpening(sanMoves: string[]): { eco: string; name: string; family: string } | null {
  if (!sanMoves || sanMoves.length === 0) return null;

  // Check most specific (longest) opening matches first
  const sorted = [...COMMON_ECO_ENTRIES].sort((a, b) => b.moves.length - a.moves.length);
  for (const entry of sorted) {
    if (sanMoves.length >= entry.moves.length) {
      const match = entry.moves.every((move, idx) => sanMoves[idx] === move);
      if (match) {
        return {
          eco: entry.eco,
          name: entry.name,
          family: entry.family
        };
      }
    }
  }

  // Fallback heuristic based on initial move
  const first = sanMoves[0];
  if (first === 'e4') return { eco: 'C20', name: 'King\'s Pawn Game', family: 'C' };
  if (first === 'd4') return { eco: 'D00', name: 'Queen\'s Pawn Game', family: 'D' };
  if (first === 'c4') return { eco: 'A10', name: 'English Opening', family: 'A' };
  if (first === 'Nf3') return { eco: 'A04', name: 'Reti Opening', family: 'A' };

  return null;
}

/**
 * Extracts opponent style features from move history.
 * @param moves List of parsed MoveRecords
 * @param targetColor The side to profile ('w' | 'b')
 */
export function extractStyleFeatures(
  moves: MoveRecord[],
  targetColor: 'w' | 'b'
): StyleProfile {
  const playerMoves = moves.filter(m => m.color === targetColor);
  const movesCount = playerMoves.length;

  if (movesCount === 0) {
    return {
      movesCount: 0,
      vector: {
        aggression: { value: 0.5, confidence: 0 },
        tactical: { value: 0.5, confidence: 0 },
        openness: { value: 0.5, confidence: 0 },
        kingSafety: { value: 0.5, confidence: 0 },
        blunderRate: { value: 0.5, confidence: 0 }
      }
    };
  }

  const confidence = calculateConfidence(movesCount, 10);

  // 1. Aggression metrics
  let captureCount = 0;
  let pawnAdvancesTowardsEnemyKing = 0;
  let earlySorties = 0;

  // 2. Tactical vs positional metrics
  let checksCount = 0;
  let queenOrRookAttacks = 0;

  // 3. King safety metrics
  let castledPly: number | null = null;
  let movesBeforeCastling = 0;

  // 4. Openness metrics
  let pawnMovesCount = 0;
  let centerPawnExchanges = 0;

  // 5. Blunder metrics
  let evalLossCount = 0;
  let totalEvalLossCp = 0;

  // 6. Time pressure metrics
  let validClockCount = 0;
  let lowTimeCount = 0;
  let rapidMovesCount = 0;

  playerMoves.forEach((moveRecord, index) => {
    const san = moveRecord.san;

    // Captures
    if (san.includes('x')) {
      captureCount++;
    }

    // Checks
    if (san.includes('+') || san.includes('#')) {
      checksCount++;
    }

    // Castling check
    if (san === 'O-O' || san === 'O-O-O') {
      if (castledPly === null) {
        castledPly = index + 1;
      }
    }

    // Pawn structure and advances
    const isPawnMove = !/^[NBRQK]/.test(san);
    if (isPawnMove) {
      pawnMovesCount++;
      const targetRank = parseInt(san.slice(-1), 10);
      if (!isNaN(targetRank)) {
        // Advanced pawns: rank 5-7 for White, rank 4-2 for Black
        if (targetColor === 'w' && targetRank >= 5) {
          pawnAdvancesTowardsEnemyKing++;
        } else if (targetColor === 'b' && targetRank <= 4) {
          pawnAdvancesTowardsEnemyKing++;
        }
      }
    }

    // Early sorties: Queen or minor piece pushed past middle ranks early
    if (index < 10 && /^[QBN]/.test(san)) {
      const destSquare = san.replace(/[+#x=QBNR]/g, '').slice(-2);
      if (destSquare.length === 2) {
        const destRank = parseInt(destSquare[1], 10);
        if (targetColor === 'w' && destRank >= 5) earlySorties++;
        if (targetColor === 'b' && destRank <= 4) earlySorties++;
      }
    }

    // Eval loss (centipawns drop from player's view)
    if (moveRecord.evalBeforeCp !== undefined && moveRecord.evalAfterCp !== undefined) {
      const drop = moveRecord.evalBeforeCp - moveRecord.evalAfterCp;
      if (drop > 0) {
        totalEvalLossCp += drop;
      }
      evalLossCount++;
    }

    // Clocks
    if (moveRecord.clockRemainingMs !== undefined) {
      validClockCount++;
      if (moveRecord.clockRemainingMs < 20000) { // under 20s
        lowTimeCount++;
      }
    }
    if (moveRecord.timeSpentMs !== undefined && moveRecord.timeSpentMs < 1000) {
      rapidMovesCount++;
    }
  });

  // Aggression score: weighted blend of capture rate, deep pawn pushes, early sorties, and checks
  const captureRate = captureCount / movesCount;
  const advanceRate = pawnAdvancesTowardsEnemyKing / movesCount;
  const sortieRate = earlySorties / Math.min(10, movesCount);
  const checkRate = checksCount / movesCount;

  const rawAggression = Math.min(
    1,
    Math.max(0, 0.35 + captureRate * 1.2 + checkRate * 1.5 + advanceRate * 0.8 + sortieRate * 0.8)
  );
  const aggressionValue = blendWithNeutral(rawAggression, confidence);

  // Tactical score: checks frequency + captures
  const forcingRate = (checksCount * 1.8 + captureCount * 1.2) / movesCount;
  const rawTactical = Math.min(1, Math.max(0, 0.3 + forcingRate * 1.3));
  const tacticalValue = blendWithNeutral(rawTactical, confidence);

  // Openness score: ratio of pawn exchanges / open game characteristics
  // Lots of pawn moves without captures often implies closed/locked positions
  const pawnRatio = pawnMovesCount / movesCount;
  const rawOpenness = Math.min(1, Math.max(0, 0.7 - pawnRatio * 0.4 + (captureRate * 0.4)));
  const opennessValue = blendWithNeutral(rawOpenness, confidence);

  // King safety score:
  // Castled early (< move 12) -> high king safety; uncastled late (> move 20) -> lower safety
  let rawKingSafety = 0.6; // baseline decent
  if (castledPly !== null) {
    if (castledPly <= 10) rawKingSafety = 0.85;
    else if (castledPly <= 16) rawKingSafety = 0.7;
    else rawKingSafety = 0.5;
  } else if (movesCount > 18) {
    rawKingSafety = 0.25; // failed to castle well into middlegame
  } else if (movesCount > 10) {
    rawKingSafety = 0.45;
  }
  const kingSafetyValue = blendWithNeutral(rawKingSafety, confidence);

  // Blunder rate score:
  let blunderValue = 0.5;
  let blunderConfidence = 0;
  if (evalLossCount > 0) {
    const avgLossCp = totalEvalLossCp / evalLossCount;
    // 0 cp avg loss -> 0.0 blunder rate; 100 cp loss -> 0.7; 200+ cp loss -> 1.0
    const rawBlunder = Math.min(1, avgLossCp / 150);
    blunderConfidence = calculateConfidence(evalLossCount, 8);
    blunderValue = blendWithNeutral(rawBlunder, blunderConfidence);
  }

  // Time pressure: only include if clock data was present
  let timePressureDim: StyleDimension | undefined = undefined;
  if (validClockCount > 0) {
    const clockConfidence = calculateConfidence(validClockCount, 8);
    const lowTimeRatio = lowTimeCount / validClockCount;
    const rapidRatio = rapidMovesCount / validClockCount;
    const rawTimePressure = Math.min(1, lowTimeRatio * 0.7 + rapidRatio * 0.3);
    timePressureDim = {
      value: blendWithNeutral(rawTimePressure, clockConfidence),
      confidence: clockConfidence
    };
  }

  // Opening information
  const allSanMoves = moves.map(m => m.san);
  const openingInfo = identifyOpening(allSanMoves);

  return {
    movesCount,
    vector: {
      aggression: { value: Number(aggressionValue.toFixed(3)), confidence: Number(confidence.toFixed(3)) },
      tactical: { value: Number(tacticalValue.toFixed(3)), confidence: Number(confidence.toFixed(3)) },
      openness: { value: Number(opennessValue.toFixed(3)), confidence: Number(confidence.toFixed(3)) },
      kingSafety: { value: Number(kingSafetyValue.toFixed(3)), confidence: Number(confidence.toFixed(3)) },
      blunderRate: { value: Number(blunderValue.toFixed(3)), confidence: Number(blunderConfidence.toFixed(3)) },
      ...(timePressureDim ? {
        timePressure: {
          value: Number(timePressureDim.value.toFixed(3)),
          confidence: Number(timePressureDim.confidence.toFixed(3))
        }
      } : {})
    },
    ...(openingInfo ? {
      eco: openingInfo.eco,
      openingName: openingInfo.name,
      openingFamily: openingInfo.family
    } : {})
  };
}
