# TwentyFish Adaptation Architecture

This document describes the design, pipeline, and guarantees of the opponent-adaptive chess engine in TwentyFish.

---

## 1. Pipeline Overview

The adaptation pipeline observes human moves in real-time, builds a multidimensional opponent style profile, and biases the engine's move selection among near-equal candidates without weakening the selected difficulty level.

```
       Human Moves (SAN/UCI)
                 │
                 ▼
    ┌──────────────────────────┐
    │     style-features.ts    │ ◄── Pure, deterministic feature extraction
    │ (StyleVector+Confidence) │
    └────────────┬─────────────┘
                 │
                 ▼
    ┌──────────────────────────┐
    │      style-model.ts      │ ◄── HeuristicStyleModel or OnnxStyleModel
    │     (AdaptationPlan)     │
    └────────────┬─────────────┘
                 │
                 ▼
    ┌──────────────────────────┐
    │     move-selector.ts     │ ◄── Hard Constraint: evalWindowCp Filter
    │  (MultiPV Re-ranking)    │ ◄── Style Weighting & Prophylaxis
    └────────────┬─────────────┘
                 │
                 ▼
         Selected Move (UCI)
```

---

## 2. Style Vector Dimensions & Confidence Scaling

Every style dimension produces a normalized value in $[0.0, 1.0]$ alongside an independent **confidence** value in $[0.0, 1.0]$ that scales asymptotically with sample size (moves observed):

$$\text{confidence}(N) = 1 - e^{-N / k}$$

Where $N$ is the number of moves played by the human and $k = 8$ (or $k = 10$).

### Dimensions

1. **Aggression:** Capture frequency, forward pawn pushes toward enemy king, early queen/minor sorties, and check frequency.
2. **Tactical vs Positional:** Proportion of forcing moves (checks, captures, direct attacks) vs positional maneuvers.
3. **Openness:** Tendency to choose or resolve pawn structures into open files and diagonals vs locked pawn chains.
4. **King Safety:** Timing of castling (early O-O vs delayed or walking king) and pawn shield integrity.
5. **Blunder/Risk Rate:** Average centipawn evaluation loss on human moves, sampled asynchronously.
6. **Time Pressure (Conditional):** Ratio of low-clock (<20s) moves and rapid moves. Omitted and marked unavailable if no clock data exists.

---

## 3. Style Models

```ts
export interface StyleModel {
  plan(v: StyleVector, ctx: PositionContext): Promise<AdaptationPlan>;
}
```

1. **`HeuristicStyleModel` (Default):**
   - **vs. Aggressive / Tactical:** Steers toward closed pawn structures, solid low-variance lines (`tacticalSharpness < 0`), piece trades (`pieceTrades > 0`), and high king defense.
   - **vs. Passive / Quiet:** Opens the board (`closedPosition < 0`), maintains tactical tension (`pieceTrades < 0`), and increases sharpness.
   - **vs. High Blunder Rate:** Increases tactical complications to challenge opponent calculation.
   - **Zero Contempt Dependency:** Because modern NNUE Stockfish removed the `Contempt` UCI option, adaptation operates strictly via candidate re-ranking.
2. **`OnnxStyleModel`:**
   - Evaluates a 5-feature input tensor against neural network weights.
   - Contract documented in `docs/style-model-contract.md`.
   - Lazy-loaded; seamlessly falls back to `HeuristicStyleModel` if the model or `onnxruntime-web` is unavailable.

---

## 4. MultiPV Re-Ranking & Strict Eval-Window Constraints

### Order of Operations
1. **MultiPV Candidate Generation:** Request top $K$ lines (default 4) from the engine.
2. **Hard Eval-Window Filter:**
   Let $S_{\text{best}}$ be the evaluation score of MultiPV line 1.
   A candidate move $m$ with score $S_m$ is eligible if and only if:
   $$S_m \ge S_{\text{best}} - \text{evalWindowCp}$$
   All candidate moves outside this window are strictly eliminated.
3. **Levels 19–20 & Forced Mates:**
   - For Levels 19 and 20, or when a forced mate is on the board ($|S| \ge 20000$), adaptation is **strictly OFF**. Line 1 is always played.
4. **Adaptive Scoring:**
   Eligible candidates are scored:
   $$\text{Score}(m) = S_m + \text{StyleBonus}(m, \text{Plan})$$
   Where $\text{StyleBonus} \in [-15, +15]$ centipawns.
5. **Stochastic Mistake Injection:**
   If `mistakeRate > 0` and triggered, the engine selects a candidate from the lower end of the *eligible* candidates, guaranteeing the move remains within `evalWindowCp`.

### Per-Level Eval-Window Table

| Level | Name | `evalWindowCp` |
| :---: | :--- | :---: |
| **L1** | Beginner | 100 cp |
| **L2** | Casual | 80 cp |
| **L3** | Novice | 60 cp |
| **L4** | Improving | 50 cp |
| **L5** | Club Player | 40 cp |
| **L6** | Strong Club | 30 cp |
| **L7** | Expert | 25 cp |
| **L8** | Candidate Master | 20 cp |
| **L9** | FIDE Master | 15 cp |
| **L10** | International Master | 12 cp |
| **L11** | Grandmaster | 10 cp |
| **L12** | Strong GM | 8 cp |
| **L13** | Elite GM | 6 cp |
| **L14** | Super GM | 5 cp |
| **L15** | World Champion | 4 cp |
| **L16** | Superhuman | 3 cp |
| **L17** | Stockfish Pro | 2 cp |
| **L18** | Stockfish Elite | 1 cp |
| **L19** | Stockfish Master | **0 cp (Off)** |
| **L20** | Stockfish Maximum | **0 cp (Off)** |

---

## 5. Web Worker Isolation

To guarantee that the user interface never freezes, all engine operations—Stockfish search, MultiPV line generation, move evaluation, and adaptive re-ranking—run exclusively in a dedicated Web Worker (`public/workers/engine-worker.js`). Communication with the React layer occurs purely over serialized UCI and JSON messages.
