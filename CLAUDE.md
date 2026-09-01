# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
pnpm install                     # engine-strict: requires Node >=24 (.nvmrc) and pnpm 9
pnpm dev                         # Apollo on :4000 + Vite (5173 is often taken by other local projects — read the Vite banner for the real port)
pnpm check                       # Biome lint/format + strict tsc, both packages — the CI gate
pnpm test                        # server (Vitest) + web (Vitest + coverage, 80% thresholds)
pnpm --filter server test curves           # single server test file (name substring)
pnpm --filter web exec vitest run App      # single web test file, without the coverage gate
pnpm --filter web exec vitest              # web watch mode
pnpm --filter server exec tsx scripts/validate.ts   # live scoring sanity table for known places
pnpm exec biome check --write .  # apply formatting before committing
```

## Architecture

Two packages, one direction of flow:

```
apps/web (React 19 + TanStack Query + graphql-request)
  → POST /graphql (Vite dev proxy → :4000)
apps/server (Apollo Server 5, SDL-first: src/schema.graphql)
  → openMeteo.ts   thin typed fetch clients (geocoding / forecast / marine), 8s timeout
  → forecast.ts    pure mapper: merge forecast+marine responses by LOCAL date → DailyInputs[]
  → scoring/       pure engine — all product logic lives here
```

- `scoring/activities.ts` is the **source of truth** for what "good" means per
  activity: weighted trapezoid factors + veto caps. The reasoning behind every
  number is in `docs/decisions/pdr-001-scoring-model.md`; change the config and
  the PDR together.
- Engine invariants (tested): missing measurements skip their factor and
  renormalize remaining weights; vetoes only ever lower a score; no data at all
  → `NOT_AVAILABLE`, a first-class status the UI renders as "not a thing here",
  never a 0. Indoor sightseeing is not scored from weather — it is
  `100 − 0.5 × outdoor` (always a viable refuge).
- Two-step API on purpose (`searchLocations` → `activityForecast(lat, lon)`):
  geocoding ambiguity is a product feature (PDR-002). Marine API failure
  degrades surfing to NOT_AVAILABLE; forecast failure fails the query
  (`UPSTREAM_ERROR`).
- Web tests mock at the `src/api/client` module boundary and render through
  `fixtures.tsx#renderApp` (fresh QueryClient, retries off). Retry policy lives
  in `main.tsx`'s QueryClient, not in hooks — keep it there.

## Process conventions

This repo is a hiring take-home where the decision trail is the deliverable:

- One branch + draft PR per vertical slice; the PR description is a work log
  (hypothesis → what the AI proposed → what was accepted/rejected → validation
  → cuts). Docs-only changes go straight to `main`.
- Product decisions → `docs/decisions/pdr-*.md`, technical ones → `adr-*.md`,
  few of each. Small honest commits that show real evolution — never rewrite
  history to look smarter.
- Scoring changes are validated two ways: table-driven scenario tests AND the
  live `validate.ts` run against known places (Ericeira surf, Madrid no-surf,
  Zermatt early-season snow). Paste the table into the PR.

## Gotchas (all earned the hard way)

- `tsx watch` does not watch `src/schema.graphql` (read via `readFileSync` at
  boot, not imported) — restart the server manually after schema edits, or
  enum changes silently serialize to `null`.
- Vite can hot-restart mid-`git checkout` and come back **without proxy
  rules** — if `/graphql` starts returning bare 404s in dev, restart Vite.
- graphql-request v7 runs `new URL(endpoint)` internally: the endpoint must be
  absolute (`client.ts` resolves it against `window.location.origin`; a
  regression test guards it).
- `test-setup.ts` must never import anything that transitively pulls `App` —
  it would instantiate the real api client before `vi.mock` can substitute it.
  That is why the matchMedia stub lives in its own `viewportStub.ts`.
- jsdom has no `matchMedia`; every web test gets the wide layout from setup —
  call `setViewport("narrow")` explicitly to test the transposed grid.
- Biome only honors `.gitignore` because `vcs.useIgnoreFile` is on in
  `biome.json`; don't remove it or `apps/web/dist` floods the lint with
  thousands of errors.
- Open-Meteo facts that shape behavior: daily `snowfall_sum` is cm but hourly
  `snow_depth` is meters (mapper takes the per-day max); marine API returns
  null arrays inland; `snow_depth` models seasonal snowpack, not glacier ice.
