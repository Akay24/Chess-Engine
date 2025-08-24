# TwentyFish

TwentyFish is a production-ready chess application with 20 calibrated Stockfish-based difficulty levels, each approximately 200 Elo apart. The application features a smooth UI/UX, comprehensive test coverage, and is designed for easy deployment.

## Features

- 20 difficulty presets (L1–L20) targeted to be ~200 Elo apart
- Play vs engine, choose side, undo (optional), resign, draw offer
- Time controls: Bullet/Blitz/Rapid/Classical + Increment
- Opening book (polyglot) for early variety (optional toggle)
- Evaluation bar, principal variation (PV) line, depth, nodes, NPS
- Move list (SAN), clocks, PGN export/import
- Per-move engine thinking indicator; smooth UX
- Board themes and piece sets; light/dark mode
- Persistent settings (LocalStorage) & Sharable game link (URL params)
- Calibration module to keep levels ~200 Elo apart using UCI options & time handicaps

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript
- **UI**: Tailwind CSS + shadcn/ui + Framer Motion + Radix primitives
- **Board**: `react-chessboard` with `chess.js` for rules/validations
- **Engine**: `stockfish.wasm` via dedicated Web Workers (one worker per engine instance)
- **State**: Zustand for state management
- **Testing**: Jest + @testing-library/react + Playwright
- **Lint/Format**: ESLint (airbnb-ish) + Prettier + Husky + lint-staged

## Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm (v7+)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/twentyfish.git
cd twentyfish

# Install dependencies
pnpm install

# Build packages
pnpm build:packages

# Start development server
pnpm dev
```

### Running in Production Mode

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
/ (monorepo root)
├─ apps/
│  └─ web/                # Next.js app (UI)
├─ packages/
│  ├─ engine/             # Engine worker, Stockfish adapters, level presets, calibration
│  ├─ ui/                  # Shared UI atoms/molecules (button, modal, panel)
│  └─ core/                # Chess utilities, PGN, time controls, persistence, types
├─ tools/
│  └─ scripts/             # One-off scripts (calibrate, download wasm, verify)
├─ .github/workflows/      # CI pipelines
├─ .vscode/                 # Recommended extensions, debug launch configs
└─ [Other files]            # License, READMEs, etc.
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Stockfish engine team for their incredible chess engine
- Chess.js and react-chessboard for the core chess functionality
- All contributors and supporters of the project
