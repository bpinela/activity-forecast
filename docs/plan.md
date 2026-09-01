# Implementation Plan

**Goal:** Ship the spec in three vertical slices, each a branch + draft PR used
as a work log, TDD on the scoring engine, ~half-day budget.

**Architecture:** pnpm monorepo (`server/`, `web/`). Pure scoring engine with
per-activity config tables; Apollo Server 4 resolvers feed it from Open-Meteo;
React UI renders the grid and the per-factor "why".

**Order:** bootstrap (main) → slice 1 scoring → slice 2 API → slice 3 UI →
README (main). Slices merge sequentially; each next branch starts from the
merged main.

---

## Task 0 — Workspace bootstrap (commit directly to main)

- [ ] `pnpm-workspace.yaml` (`server`, `web`), root `package.json` (scripts:
  `dev`, `test`, `typecheck`, `check`), `.gitignore`, `biome.json`,
  `tsconfig.base.json` (strict)
- [ ] `server/` package: TypeScript, Vitest, `tsx` for dev; no runtime deps yet
- [ ] Commit: `chore: pnpm workspace, server scaffolding, biome + vitest`

## Task 1 — Slice 1: scoring engine (`slice/scoring-engine`, draft PR)

**Files:** `server/src/scoring/{curves,types,engine,activities}.ts` + colocated
`*.test.ts`, `server/scripts/validate.ts`, `docs/decisions/pdr-001-scoring-model.md`

TDD loop per unit (write failing test → run, see fail → minimal impl → green → commit):

- [ ] `curves.ts`: `trapezoid(x, a, b, c, d)` (one-sided via ±Infinity,
  degenerate a===b / c===d allowed → step), optional floor clamp.
  Tests: below/at/inside/above every knee, one-sided curves, floor.
- [ ] `types.ts`: `DailyInputs` (date, weatherCode, tempMax/Min, snowfallSumCm,
  snowDepthMaxM, rainSumMm, precipSumMm, precipProbMaxPct, windMaxKmh,
  gustsMaxKmh, cloudCoverMeanPct, `marine: { waveHeightMaxM, wavePeriodMaxS } | null`),
  `FactorConfig` (name, unit, weight, extract, curve), `Veto` (reason, applies,
  cap), `ActivityResult` (status SCORED | NOT_AVAILABLE, score, label, factors[], vetoes[]).
- [ ] `engine.ts`: `scoreActivity(config, inputs)` — weighted sum over factors;
  a factor whose measurement is null is skipped and remaining weights
  renormalized (partial data beats fake neutrality); no available factors →
  NOT_AVAILABLE; vetoes cap the score; `labelFor(score)` bands 80/60/40.
  Tests: weighted sum math, cap picks the lowest, renormalization, empty case.
- [ ] `activities.ts`: config tables (numbers below) + `scoreDay(inputs)` →
  results for all 4 activities; surfing returns NOT_AVAILABLE when `marine`
  is null; indoor = `round(100 − 0.5 × outdoor.score)` (post-veto outdoor).
  Table-driven scenario tests: powder day beats groomer beats no-snow;
  flat ocean ≈ 0; 2 m/12 s glassy day ≥ 80; storm caps surf at 10 and outdoor
  at 15; Dubai-heat day capped; grey-but-dry outdoor day still ≥ ~55;
  indoor inverts outdoor; marine null → NOT_AVAILABLE.
- [ ] `scripts/validate.ts`: self-contained fetch (geocode by name → forecast +
  marine → scoreDay), prints a score table. Run for Ericeira, Madrid,
  Reykjavik, Dubai, Zermatt — sanity-read the output, tune only with a reason,
  paste table + reasoning into the PR.
- [ ] `pdr-001-scoring-model.md`: factor curves/weights/vetoes + why, indoor
  complement, city-coords assumption, renormalization rule.
- [ ] Draft PR `slice/scoring-engine` — work log: hypotheses → AI proposals →
  accepted/rejected → validation output → cuts. Merge when green.

### Scoring numbers (locked in design review)

Curves are `trapezoid(a,b,c,d)`: 0 ≤a, ramp a→b, 1 in [b,c], ramp c→d, 0 ≥d.
"↓ x→y" = one-sided decline (1 until x, 0 at y). "↑ x→y" = one-sided rise.

| Activity | Factor (measurement) | Curve | Weight |
|---|---|---|---|
| Ski | snow base (snowDepthMaxM) | ↑ 0.02→0.30 | .25 |
| Ski | fresh snow (snowfallSumCm) | trap(0, 3, 25, 60) | .15 |
| Ski | temperature (tempMax °C) | trap(−18, −8, −1, 7) | .20 |
| Ski | wind (gustsMaxKmh) | ↓ 25→65 | .20 |
| Ski | sky (cloudCoverMeanPct) | ↓ 40→100 | .10 |
| Ski | no rain (rainSumMm) | ↓ 0→8 | .10 |
| Surf | wave height (waveHeightMaxM) | trap(0.3, 1.0, 2.5, 5.0) | .35 |
| Surf | wave period (wavePeriodMaxS) | ↑ 5→9 | .25 |
| Surf | low wind (windMaxKmh) | ↓ 12→40 | .25 |
| Surf | weather (weatherCode map) | 0-1:1 · 2-3:.9 · fog:.7 · drizzle:.6 · rain:.5 · frz rain:.3 · snow:.4 · showers:.5 · storm:0 | .15 |
| Outdoor | dry (precipSumMm) | ↓ 0→12 | .25 |
| Outdoor | rain risk (precipProbMaxPct) | ↓ 20→75 | .15 |
| Outdoor | temperature (tempMax °C) | trap(2, 14, 25, 35) | .25 |
| Outdoor | sky (cloudCoverMeanPct) | ↓ 30→100, floor 0.3 | .20 |
| Outdoor | calm (windMaxKmh) | ↓ 20→55 | .15 |

Vetoes (cap, reason): Ski — depth<0.05 m AND fresh<5 cm →15 "no snow cover";
storm (WMO 95-99) →20; freezing rain (66-67) →30; gusts ≥80 →25 "lifts likely
closed". Surf — marine null → NOT_AVAILABLE; storm →10 "lightning risk";
waves >6 m →20 "hazardous size". Outdoor — storm →15; precip ≥25 mm →25;
tempMax ≥38 →30; tempMax ≤−12 →30. Indoor — none.

## Task 2 — Slice 2: GraphQL API (`slice/graphql-api`, draft PR)

**Files:** `server/src/{openMeteo,forecast,resolvers,index}.ts`,
`server/src/schema.graphql`, `forecast.test.ts`,
`docs/decisions/{adr-001-apollo-server,pdr-002-ambiguity-not-available}.md`

- [ ] `openMeteo.ts`: typed thin clients — `geocode(query, limit)`,
  `fetchForecast(lat, lon)` (daily: weather_code, temperature_2m_max/min,
  snowfall_sum, rain_sum, precipitation_sum, precipitation_probability_max,
  wind_speed_10m_max, wind_gusts_10m_max, cloud_cover_mean; hourly: snow_depth;
  timezone=auto, forecast_days=7), `fetchMarine(lat, lon)` (daily:
  wave_height_max, wave_period_max). `AbortSignal.timeout(8000)`, non-200 →
  typed error.
- [ ] `forecast.ts` (pure, TDD): merge forecast+marine responses by local date →
  `DailyInputs[]`; hourly snow_depth → per-day max; all-null marine day →
  `marine: null`. Tests: happy merge, marine nulls, date mismatch, missing
  hourly bucket.
- [ ] `schema.graphql` (SDL from spec) + `resolvers.ts` (parallel fetches,
  scoreDay, GraphQL-safe errors) + `index.ts` (startStandaloneServer :4000).
- [ ] Smoke via GraphiQL/curl: Springfield candidates, Ericeira forecast,
  Madrid NOT_AVAILABLE — paste results into PR.
- [ ] ADR-001 (Apollo over Yoga — ecosystem maturity; AI recommended Yoga,
  overruled), PDR-002 (two-step API, NOT_AVAILABLE as status not zero).
- [ ] Draft PR → merge.

## Task 3 — Slice 3: Web UI (`slice/web-ui`, draft PR)

**Files:** `web/` (Vite react-ts scaffold), `web/vite.config.ts` (proxy
`/graphql` → `localhost:4000`), `web/src/api/{types,client,hooks}.ts`,
`web/src/components/{LocationSearch,ForecastGrid,ScoreCell,DayDetail}.tsx`,
`web/src/{App.tsx,styles.css}`, `docs/decisions/adr-002-tanstack-query.md`

- [ ] Hooks: `useLocationSearch` (debounced 300 ms, enabled ≥2 chars),
  `useActivityForecast(location | null)`; hand-typed response types
  (codegen = stretch).
- [ ] Components: combobox with candidates + "no places found"; 4×7 grid,
  score + band chip (number always visible), best-day ring per row; surfing
  NOT_AVAILABLE row state; cell click → factor breakdown (value, unit,
  weighted bar) + veto banners; skeleton grid; error banner + retry; initial
  state with example chips (Ericeira, Chamonix, Reykjavik); horizontal scroll
  on narrow screens.
- [ ] Manual QA checklist in PR (states: initial/loading/error/empty/
  not-available; keyboard: arrows+enter in combobox).
- [ ] ADR-002 (TanStack Query + graphql-request over Apollo Client — no
  normalized cache for one read-only query).
- [ ] Draft PR → merge.

## Task 4 — README + final pass (main)

- [ ] README: what it is, how to run (`pnpm i && pnpm dev`), how to test,
  assumptions summary, links to spec/PDRs/ADRs/PRs, what was cut and why.
- [ ] `pnpm check && pnpm test` green at root; fresh-clone run-through.

## PR work-log template (used in all three PRs)

```
## Hypothesis
## Decisions in this slice (AI proposed → I decided)
## How I validated
## Cut / deferred (and why)
```
