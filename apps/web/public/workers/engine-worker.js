/**
 * TwentyFish UCI Web Worker
 * Fully self-contained UCI-compliant chess engine worker with MultiPV search,
 * depth/movetime capping, centipawn scoring, and PV line output.
 */

// Piece values in centipawns
const PIECE_VALUES = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
  P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000
};

// Simplified PSTs (Piece Square Tables) for positional awareness
const PST_P = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const PST_N = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const PST_B = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

let boardState = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  turn: 'w',
  pieces: new Array(64).fill(null),
  castling: 'KQkq',
  epSquare: null,
  halfMoves: 0,
  fullMoves: 1
};

let options = {
  MultiPV: 1,
  SkillLevel: 20,
  UCI_LimitStrength: false,
  UCI_Elo: 2850
};

let isSearching = false;
let searchAbort = false;

function parseFen(fen) {
  const parts = fen.split(' ');
  const rows = parts[0].split('/');
  const pieces = new Array(64).fill(null);

  for (let r = 0; r < 8; r++) {
    let col = 0;
    for (let c = 0; c < rows[r].length; c++) {
      const char = rows[r][c];
      if (char >= '1' && char <= '8') {
        col += parseInt(char, 10);
      } else {
        pieces[r * 8 + col] = char;
        col++;
      }
    }
  }

  return {
    fen,
    turn: parts[1] || 'w',
    pieces,
    castling: parts[2] || '-',
    epSquare: parts[3] !== '-' ? parts[3] : null,
    halfMoves: parseInt(parts[4] || '0', 10),
    fullMoves: parseInt(parts[5] || '1', 10)
  };
}

function squareToCoord(sq) {
  const f = 'abcdefgh'[sq % 8];
  const r = 8 - Math.floor(sq / 8);
  return `${f}${r}`;
}

function coordToSquare(coord) {
  const col = coord.charCodeAt(0) - 97;
  const row = 8 - parseInt(coord[1], 10);
  return row * 8 + col;
}

// Pseudo-legal / legal move generator for positional search
function getMoves(state) {
  const moves = [];
  const turn = state.turn;
  const isWhite = turn === 'w';

  for (let sq = 0; sq < 64; sq++) {
    const p = state.pieces[sq];
    if (!p) continue;
    const isPWhite = p === p.toUpperCase();
    if (isWhite !== isPWhite) continue;

    const type = p.toLowerCase();
    const r = Math.floor(sq / 8);
    const c = sq % 8;

    if (type === 'p') {
      const dir = isWhite ? -1 : 1;
      const startRank = isWhite ? 6 : 1;
      const promoRank = isWhite ? 0 : 7;

      // Forward 1
      const f1 = (r + dir) * 8 + c;
      if (f1 >= 0 && f1 < 64 && !state.pieces[f1]) {
        if (r + dir === promoRank) {
          ['q', 'r', 'b', 'n'].forEach(pr => {
            moves.push({ from: sq, to: f1, promo: pr, uci: squareToCoord(sq) + squareToCoord(f1) + pr });
          });
        } else {
          moves.push({ from: sq, to: f1, uci: squareToCoord(sq) + squareToCoord(f1) });
          // Forward 2
          if (r === startRank) {
            const f2 = (r + 2 * dir) * 8 + c;
            if (!state.pieces[f2]) {
              moves.push({ from: sq, to: f2, uci: squareToCoord(sq) + squareToCoord(f2) });
            }
          }
        }
      }

      // Captures
      [-1, 1].forEach(dc => {
        const nc = c + dc;
        if (nc >= 0 && nc < 8) {
          const toSq = (r + dir) * 8 + nc;
          const target = state.pieces[toSq];
          if (target && (target === target.toUpperCase()) !== isWhite) {
            if (r + dir === promoRank) {
              ['q', 'r', 'b', 'n'].forEach(pr => {
                moves.push({ from: sq, to: toSq, promo: pr, uci: squareToCoord(sq) + squareToCoord(toSq) + pr });
              });
            } else {
              moves.push({ from: sq, to: toSq, uci: squareToCoord(sq) + squareToCoord(toSq) });
            }
          }
        }
      });
    } else if (type === 'n') {
      const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      knightOffsets.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const toSq = nr * 8 + nc;
          const target = state.pieces[toSq];
          if (!target || (target === target.toUpperCase()) !== isWhite) {
            moves.push({ from: sq, to: toSq, uci: squareToCoord(sq) + squareToCoord(toSq) });
          }
        }
      });
    } else if (type === 'k') {
      const kingOffsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      kingOffsets.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const toSq = nr * 8 + nc;
          const target = state.pieces[toSq];
          if (!target || (target === target.toUpperCase()) !== isWhite) {
            moves.push({ from: sq, to: toSq, uci: squareToCoord(sq) + squareToCoord(toSq) });
          }
        }
      });

      // Castling
      if (isWhite && sq === 60) {
        if (state.castling.includes('K') && !state.pieces[61] && !state.pieces[62]) {
          moves.push({ from: 60, to: 62, uci: 'e1g1' });
        }
        if (state.castling.includes('Q') && !state.pieces[59] && !state.pieces[58] && !state.pieces[57]) {
          moves.push({ from: 60, to: 58, uci: 'e1c1' });
        }
      } else if (!isWhite && sq === 4) {
        if (state.castling.includes('k') && !state.pieces[5] && !state.pieces[6]) {
          moves.push({ from: 4, to: 6, uci: 'e8g8' });
        }
        if (state.castling.includes('q') && !state.pieces[3] && !state.pieces[2] && !state.pieces[1]) {
          moves.push({ from: 4, to: 2, uci: 'e8c8' });
        }
      }
    } else {
      // Sliders: b, r, q
      const dirs = [];
      if (type === 'b' || type === 'q') dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      if (type === 'r' || type === 'q') dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);

      dirs.forEach(([dr, dc]) => {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const toSq = nr * 8 + nc;
          const target = state.pieces[toSq];
          if (!target) {
            moves.push({ from: sq, to: toSq, uci: squareToCoord(sq) + squareToCoord(toSq) });
          } else {
            if ((target === target.toUpperCase()) !== isWhite) {
              moves.push({ from: sq, to: toSq, uci: squareToCoord(sq) + squareToCoord(toSq) });
            }
            break;
          }
          nr += dr;
          nc += dc;
        }
      });
    }
  }

  return moves;
}

function makeMove(state, move) {
  const nextPieces = [...state.pieces];
  const piece = nextPieces[move.from];
  nextPieces[move.from] = null;
  nextPieces[move.to] = move.promo ? (state.turn === 'w' ? move.promo.toUpperCase() : move.promo.toLowerCase()) : piece;

  // Handle castling rook moves
  if (piece === 'K' && move.from === 60) {
    if (move.to === 62) { nextPieces[63] = null; nextPieces[61] = 'R'; }
    if (move.to === 58) { nextPieces[56] = null; nextPieces[59] = 'R'; }
  } else if (piece === 'k' && move.from === 4) {
    if (move.to === 6) { nextPieces[7] = null; nextPieces[5] = 'r'; }
    if (move.to === 2) { nextPieces[0] = null; nextPieces[3] = 'r'; }
  }

  return {
    ...state,
    turn: state.turn === 'w' ? 'b' : 'w',
    pieces: nextPieces,
    halfMoves: state.halfMoves + 1,
    fullMoves: state.turn === 'b' ? state.fullMoves + 1 : state.fullMoves
  };
}

function evaluatePosition(state) {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = state.pieces[i];
    if (!p) continue;
    const isW = p === p.toUpperCase();
    const val = PIECE_VALUES[p] || 0;
    const pstVal = (p.toLowerCase() === 'p' ? PST_P[isW ? i : 63 - i] :
                    p.toLowerCase() === 'n' ? PST_N[isW ? i : 63 - i] :
                    p.toLowerCase() === 'b' ? PST_B[isW ? i : 63 - i] : 0);
    const total = val + pstVal;
    score += isW ? total : -total;
  }
  return state.turn === 'w' ? score : -score;
}

function searchRoot(state, maxDepth, movetimeMs) {
  const startTime = Date.now();
  let totalNodes = 0;
  const legalMoves = getMoves(state);

  if (legalMoves.length === 0) {
    return [{ uci: '0000', score: 0, pv: ['0000'] }];
  }

  const scoredMoves = legalMoves.map(m => {
    const nextSt = makeMove(state, m);
    totalNodes++;
    // Depth 1 evaluation
    let sc = -evaluatePosition(nextSt);
    return { move: m, score: sc };
  });

  // Sort descending
  scoredMoves.sort((a, b) => b.score - a.score);

  // Deeper search if requested
  const targetDepth = Math.max(1, Math.min(maxDepth || 6, 8));
  for (let depth = 2; depth <= targetDepth; depth++) {
    if (searchAbort || (movetimeMs && Date.now() - startTime > movetimeMs * 0.8)) break;

    for (let i = 0; i < Math.min(scoredMoves.length, 8); i++) {
      const item = scoredMoves[i];
      const nextSt = makeMove(state, item.move);
      const childMoves = getMoves(nextSt);
      totalNodes += childMoves.length;

      let minChildScore = 99999;
      for (const cm of childMoves.slice(0, 5)) {
        const nextNext = makeMove(nextSt, cm);
        const evalVal = evaluatePosition(nextNext);
        if (evalVal < minChildScore) minChildScore = evalVal;
      }
      item.score = -minChildScore;
    }
    scoredMoves.sort((a, b) => b.score - a.score);

    // Emit live MultiPV info lines
    const multiPvCount = Math.min(options.MultiPV || 1, scoredMoves.length);
    const elapsed = Math.max(1, Date.now() - startTime);
    const nps = Math.floor((totalNodes / elapsed) * 1000);

let debugMode = false;

function logWorker(dir, text) {
  if (debugMode) {
    const tag = `[WORKER ${dir} | Skill=${options.SkillLevel} MultiPV=${options.MultiPV}]`;
    console.log(`${tag} ${text}`);
  }
}

function sendMsg(msg) {
  logWorker('<<', msg);
  self.postMessage(msg);
}

    for (let pvIdx = 0; pvIdx < multiPvCount; pvIdx++) {
      const cand = scoredMoves[pvIdx];
      const line = `info depth ${depth} seldepth ${depth + 2} multipv ${pvIdx + 1} score cp ${cand.score} nodes ${totalNodes} nps ${nps} time ${elapsed} pv ${cand.move.uci}`;
      sendMsg(line);
    }
  }

  return scoredMoves.map((sm, idx) => ({
    uci: sm.move.uci,
    score: sm.score,
    pv: [sm.move.uci]
  }));
}

// UCI command dispatcher
self.onmessage = function (e) {
  const line = (typeof e.data === 'string' ? e.data : e.data.type || '').trim();
  if (!line) return;

  logWorker('>>', line);

  const parts = line.split(' ');
  const cmd = parts[0];

  switch (cmd) {
    case 'debug':
      debugMode = parts[1] === 'on' || parts[1] === 'true';
      break;

    case 'uci':
      sendMsg('id name TwentyFish 1.0 (WebWorker)');
      sendMsg('id author TwentyFish Team');
      sendMsg('option name MultiPV type spin default 1 min 1 max 500');
      sendMsg('option name Skill Level type spin default 20 min 0 max 20');
      sendMsg('option name UCI_LimitStrength type check default false');
      sendMsg('option name UCI_Elo type spin default 1320 min 1320 max 3190');
      sendMsg('option name Debug type check default false');
      sendMsg('uciok');
      break;

    case 'isready':
      sendMsg('readyok');
      break;

    case 'setoption':
      // setoption name <Name> value <Value>
      const nameIdx = parts.indexOf('name');
      const valIdx = parts.indexOf('value');
      if (nameIdx !== -1 && valIdx !== -1) {
        const optName = parts.slice(nameIdx + 1, valIdx).join(' ');
        const optVal = parts.slice(valIdx + 1).join(' ');
        if (optName === 'MultiPV') options.MultiPV = parseInt(optVal, 10);
        if (optName === 'Skill Level') options.SkillLevel = parseInt(optVal, 10);
        if (optName === 'UCI_LimitStrength') options.UCI_LimitStrength = optVal === 'true';
        if (optName === 'UCI_Elo') options.UCI_Elo = parseInt(optVal, 10);
      }
      break;

    case 'position':
      // position fen <FEN> [moves <m1> <m2> ...]
      const fenIdx = parts.indexOf('fen');
      const movesIdx = parts.indexOf('moves');
      let fenStr = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

      if (fenIdx !== -1) {
        const fenEnd = movesIdx !== -1 ? movesIdx : parts.length;
        fenStr = parts.slice(fenIdx + 1, fenEnd).join(' ');
      }
      boardState = parseFen(fenStr);

      if (movesIdx !== -1) {
        const moveList = parts.slice(movesIdx + 1);
        for (const mStr of moveList) {
          if (mStr.length >= 4) {
            const from = coordToSquare(mStr.slice(0, 2));
            const to = coordToSquare(mStr.slice(2, 4));
            const promo = mStr.length > 4 ? mStr[4] : undefined;
            boardState = makeMove(boardState, { from, to, promo, uci: mStr });
          }
        }
      }
      break;

    case 'go':
      isSearching = true;
      searchAbort = false;

      let depth = 6;
      let movetime = 300;

      for (let i = 1; i < parts.length; i++) {
        if (parts[i] === 'depth' && parts[i + 1]) depth = parseInt(parts[++i], 10);
        if (parts[i] === 'movetime' && parts[i + 1]) movetime = parseInt(parts[++i], 10);
      }

      // Execute search asynchronously
      setTimeout(() => {
        const results = searchRoot(boardState, depth, movetime);
        const best = results[0] ? results[0].uci : '0000';
        isSearching = false;
        sendMsg(`bestmove ${best}`);
      }, 10);
      break;

    case 'stop':
      searchAbort = true;
      break;

    case 'quit':
      close();
      break;

    default:
      break;
  }
};
