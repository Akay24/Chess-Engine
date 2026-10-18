# TwentyFish — Opponent-Adaptive Chess Engine

TwentyFish is an opponent-adaptive chess application built with Next.js (Pages Router), featuring 20 difficulty levels, live opponent style profiling, and adaptive move re-ranking that exploits human tendencies without weakening the chosen level.

---

## Features

- **20 Difficulty Presets (L1–L20):** Ranging from beginner (L1) to maximum engine depth (L20).
- **Opponent Style Profiling:** Real-time multi-dimensional vector tracking:
  - Aggression (captures, flank pushes, queen/minor sorties, checks)
  - Tactical vs. Positional (forcing move frequency, line sharpness)
  - Open vs. Closed structure preferences
  - King Safety (castling speed, pawn shield degradation)
  - Blunder / Error rate (asynchronous evaluation swing tracking)
  - Time pressure (clock consumption and rapid move analysis)
  - ECO opening family recognition
- **Adaptive Move Selector:**
  - MultiPV candidate analysis (default 4 lines).
  - Strict eval-window filter ensuring no move outside `evalWindowCp` can ever be selected.
  - Heuristic and ONNX-based model support with automatic graceful fallback.
  - Levels 19–20: adaptation strictly turned off (pure best move).
- **Modern Responsive UI (3-Rail Desktop, Responsive down to 360px):**
  - **Left Rail:** Vertical eval bar, depth, nodes, NPS, and PV lines.
  - **Center:** Interactive chessboard with check indicator, last-move highlight, legal-move dots, and dual clocks.
  - **Right Rail:** Scrollable SAN move list (click-to-review), game controls, and L1–L20 selector.
  - **Opponent Profile Panel:** Interactive SVG radar chart with confidence muting, adaptation toggle, and plain-language strategy explanations.
- **Game Management:** PGN export/import modal, takeback (undo), resign, draw offers, board themes, dark/light modes, and shareable URL parameters (`?fen=...&level=...`).

---

## Important Engine Architecture Note: UCI_Elo vs. Level Separation

In Stockfish UCI implementations, the valid range for `UCI_Elo` is clamped between **1320 and 3190** (default 1320):
- Low levels (L1–L3: target 800–1200) are clamped at 1320 by the engine; their realistic handicap is achieved through shallow search caps (`depth: 2–4`, `movetimeMs: 50–100`) and low `Skill Level` (0–3).
- High levels (L12–L20: target 3000+) are separated primarily through deeper search depths (13–30) and time allowances rather than real Elo differentiation above the 3190 cap.
- The `Contempt` option was removed in modern NNUE Stockfish; all style steering is achieved via MultiPV candidate move re-ranking within the per-level centipawn eval window.

---

## Tech Stack

- **Frontend:** Next.js 14 (**Pages Router**) + React 18 + TypeScript
- **UI:** Tailwind CSS + Radix UI Primitives + Lucide Icons
- **Board:** `react-chessboard` + `chess.js`
- **Engine:** Dedicated Web Worker (runs all search, MultiPV, and adaptation off the main thread)
- **State Management:** Zustand
- **Testing:** Jest + `ts-jest` + `@testing-library/react`

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm (v8+) or `corepack enable`

### Installation

```bash
# Clone the repository
git clone https://github.com/Akay24/Chess-Engine.git
cd Chess-Engine

# Install dependencies across all workspace packages
pnpm install

# Build workspace packages
pnpm build:packages

# Start development server
pnpm dev
```

### Running Tests

```bash
# Run engine package unit tests (including adaptation, features, and property tests)
pnpm --filter "@twentyfish/engine" test

# Run web app store and component tests
pnpm --filter twentyfish-web test

# Build production bundle
pnpm build:packages
pnpm build
```

---

## Project Structure

```
TwentyFish/
├── apps/
│   └── web/                   # Next.js Pages Router application (UI & Web Worker)
├── packages/
│   ├── engine/                # Engine adapters, presets, and adaptation modules
│   │   └── src/
│   │       ├── adaptation/    # style-features, style-model, move-selector
│   │       ├── presets.ts     # 20 calibrated level presets
│   │       └── stockfish-engine.ts
│   ├── core/                  # Game manager, clocks, PGN utilities
│   └── ui/                    # Reusable UI primitives
└── docs/
    ├── adaptation-architecture.md  # Detailed adaptation pipeline documentation
    └── style-model-contract.md     # Neural ONNX I/O contract specification
```

---

## License

MIT
