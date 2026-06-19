# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Run production build
npm run lint         # ESLint
npm run export-data  # Export SQLite → JSON (run after DB changes)
```

There are no automated tests in this project.

## Architecture

This is a Next.js 16 app (App Router, TypeScript, Tailwind CSS) for FIFA World Cup 2026 match predictions. The UI is in German.

### Data layer (dual-mode)

- **Development**: reads directly from `data/football.db` (SQLite via `better-sqlite3`, opened read-only in `lib/db.ts`)
- **Production**: reads from JSON snapshots in `data/` (`matches.json`, `teams.json`, `tournaments.json`, `venues.json`)

Every function in `lib/queries.ts` has a `process.env.NODE_ENV === "production"` branch that uses in-memory JSON instead of SQLite. After updating the DB, run `npm run export-data` to regenerate these JSON files so production stays in sync.

`data/worldcup.teams.json` is static and not exported — it defines the 48 WC 2026 teams with their group assignments, confederation, and flag emoji.

### Data flow

`app/page.tsx` is a Server Component that drives everything:
1. Fetches fixtures + team flags + team stats from `lib/queries.ts`
2. Calls `predictMatch()` for every fixture → `Prediction` (Poisson model)
3. Calls `getBets()` → `Bet[]` (betting recommendations derived from the prediction)
4. Assembles `ProcessedGame[]` objects
5. Computes group standings via `computeGroupStandings()` in `lib/groupStandings.ts`
6. Computes the playoff bracket via `computePlayoffBracket()` in `lib/playoff.ts`
7. Passes everything to `<Dashboard>` (the client root component)

The page is marked `export const dynamic = "force-dynamic"` — no caching.

### Prediction engine (`lib/predictions.ts`)

- Uses the **Poisson distribution** to model goal-scoring for each team
- Base expected goals (λ) derived from team attack/defence averages since 2020 vs. global average (1.42 goals/game)
- Adjusted by: home advantage (×1.12), FIFA ranking points gap (±40% scaled over 1000-pt diff), and recent form (last 10 games, exponentially weighted, ±15%)
- `predictMatch()` returns win/draw/loss probabilities, top 5 scorelines, BTTS, and over-x.5 markets
- `getBets()` filters to only show bets with odds > 1.20 (prob < 0.833)

### Group standings (`lib/groupStandings.ts`)

- Already-played games use actual scores; future games use predicted `lambdaH`/`lambdaA` as expected goals
- 48 teams, 12 groups (A–L), top 2 per group + best 8 third-place teams advance (WC 2026 format)
- Team name aliases map DB names → `worldcup.teams.json` names (e.g. "United States" → "USA")

### Playoff bracket (`lib/playoff.ts`)

- Fixed R32 bracket slots from the official FIFA draw are hardcoded in `R32_BRACKET`
- Win probability uses a blend: 70% FIFA points Elo-style, 30% group stage performance
- Bracket propagates winners deterministically (no Monte Carlo) using the highest-probability winner

### Component structure

`Dashboard` (client) is the single interactive shell. It owns all state (active tab, search, filter, odds format) and renders:
- `Header` / `StatsBar` — top display
- `FilterBar` — search + filter presets + odds format toggle
- `BatchPanel` — highlights top bets across all games
- `MatchList` → `MatchCard` — per-game prediction cards
- `GroupStandings` — 12-group table view
- `PlayoffBracketView` (`PlayoffBracket.tsx`) — bracket visualization

The `ProcessedGame` type (defined in `Dashboard.tsx`) is the central data shape passed down to all child components.