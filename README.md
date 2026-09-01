# Activity Forecast

[![ci](https://github.com/bpinela/activity-forecast/actions/workflows/ci.yml/badge.svg)](https://github.com/bpinela/activity-forecast/actions/workflows/ci.yml)

Type a city or town, get the next 7 days ranked 0–100 for four activities —
skiing, surfing, outdoor sightseeing, indoor sightseeing — with every score
explainable down to its weather factors. Node + GraphQL backend, React
frontend, all data from [Open-Meteo](https://open-meteo.com) (free, no key).

## Run it

Requires Node 24+ and pnpm 9+.

```sh
pnpm install
pnpm dev        # Apollo Server on :4000 (Apollo Sandbox) + Vite (5173 or next free port)
```

```sh
pnpm test       # scoring engine + mapper tests, web component tests with coverage
pnpm check      # Biome lint/format + strict tsc across both packages
pnpm --filter server exec tsx scripts/validate.ts   # live sanity table for known places
```

Layout: `apps/server` (GraphQL + scoring) and `apps/web` (React UI). Node and
pnpm versions are pinned (`.nvmrc`, `engines` + `engine-strict`,
`packageManager`); CI runs checks, all tests and the web build on every push
and PR.

## How it works

- `searchLocations(query)` returns ranked geocoding candidates; the UI resolves
  the top one and shows the rest as "not it?" alternatives — "Springfield"
  ambiguity is a visible product feature, not a silent roulette.
- `activityForecast(latitude, longitude)` fetches the forecast and marine APIs
  in parallel, merges them by local date, and runs a pure scoring engine:
  weighted trapezoid "ideal range" factors per activity, then veto caps with
  human-readable reasons ("No meaningful snow cover", "Lightning risk").
  Indoor sightseeing is the complement of outdoor comfort — museums shine when
  the weather doesn't.
- Scores share one 0–100 scale with diverging bands (Great ≥80 … Bad <20), so
  days and activities are comparable; the UI grid is just that matrix, and
  clicking a cell shows the factors and vetoes behind the number.
- Surfing in a landlocked city is **not available** (detected via null marine
  data), never a misleading zero.

## How this was built

The process is the submission, per the exercise: AI-assisted throughout, with
the decisions and their trail kept honest.

- [`docs/spec.md`](docs/spec.md) — short spec: features, open questions with
  the assumptions I committed to, deliberate cuts.
- [`docs/plan.md`](docs/plan.md) — implementation plan: vertical slices, TDD
  tasks, the locked scoring numbers.
- [`docs/decisions/`](docs/decisions) — PDR-001 scoring model, PDR-002
  ambiguity & not-available, ADR-001 Apollo Server (where I overruled the AI's
  recommendation), ADR-002 TanStack Query.
- PRs [#1](https://github.com/bpinela/activity-forecast/pull/1) scoring engine,
  [#2](https://github.com/bpinela/activity-forecast/pull/2) GraphQL API,
  [#3](https://github.com/bpinela/activity-forecast/pull/3) web UI,
  [#4](https://github.com/bpinela/activity-forecast/pull/4) workspace hardening
  (apps/ layout, frontend test suite, Node pins, CI) — each PR description is a
  work log: hypothesis, what the AI proposed, what I accepted/rejected, how it
  was validated, what was cut. Highlights: a scenario test catching a flat
  ocean scoring 59, a Zugspitze investigation that turned out to be an upstream
  data limitation (documented instead of tuned away), and a browser-only
  graphql-request bug that slipped through the exact seam the frontend-test cut
  had left open — found in QA, fixed on main, then closed properly by the PR #4
  suite.
- [`CLAUDE.md`](CLAUDE.md) — conventions and earned gotchas for AI-assisted
  sessions in this repo, since AI collaboration is part of how it's built.

## Key assumptions (full list in the spec)

- Conditions are scored at the place's own coordinates/elevation — no
  nearest-resort/nearest-break search. Searching the mountain or surf town
  directly works ("Zermatt", "Ericeira").
- Scored for the general public: 6 m waves cap as hazardous even though pros
  ride them.
- Daily aggregates only; "next 7 days" includes today; metric units.
- Open-Meteo `snow_depth` models seasonal snowpack, not glacier ice — summer
  glacier skiing won't register (verified upstream).

## Cut on purpose

Caching/rate limiting, GraphQL codegen, surf wind direction (needs coastline
bearing), hourly granularity, deploy, i18n, extracting the scoring engine into
its own package (it has one consumer). Frontend automated tests were originally
cut too — that cut was reversed in PR #4 after a browser-only bug escaped
through exactly that gap. Reasons live in the spec and PR logs.
