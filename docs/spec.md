# Spec — Activity Forecast

Given a city or town, rank how good each of the next 7 days will be for four
activities: skiing, surfing, outdoor sightseeing, indoor sightseeing. All weather
data from Open-Meteo (free, no key). Nothing is persisted; Open-Meteo is called
per request.

Time budget is ~half a day, so scope is cut aggressively and the cuts are listed
here instead of built.

## Features

- **Place search with explicit ambiguity.** Typing "Springfield" returns ranked
  candidates (name, region, country, population); the user picks one. No matches
  is a "no places found" state, not an error.
- **Score grid.** For the chosen place: 4 activities × 7 days, each cell a 0–100
  score with a band on a diverging scale (Great ≥80 / Good ≥60 / Fair ≥40 /
  Poor ≥20 / Bad <20). Best day per activity is highlighted. Ranking days =
  sorting cells; no extra API field.
- **Every score is explainable.** A cell opens a breakdown: the factors behind
  the score (measured value, unit, weight, sub-score) and any veto that capped it
  ("thunderstorm risk", "no snow cover").
- **"Not a thing here" is a distinct state, not a low score.** Surfing in Madrid
  shows "not available — no surfable coast nearby" (detected via null marine
  data), never a misleading 0/100.
- Honest loading (skeleton grid), error (banner + retry) and empty states.

## Scoring in one paragraph

Each activity defines weighted factors over daily measurements. A factor maps its
measurement onto 0–1 through a trapezoid "ideal range" curve (e.g. surf wave
height ramps up from 0.3 m, is ideal 1–2.5 m, falls off to 5 m). The day's score
is `round(100 × Σ weightᵢ · factorᵢ)`, then vetoes cap it with a human-readable
reason (no snow → skiing capped at 15; lightning → surfing capped at 10). Indoor
sightseeing is the complement of outdoor comfort: `100 − 0.5 × outdoor`, so it
lives in [50..100] — museums are always a viable option, and they shine exactly
when outside is miserable. One shared 0–100 scale keeps days and activities comparable. Curves,
weights and vetoes with their reasoning live in PDR-001 (scoring slice).

## Architecture

pnpm workspace monorepo:

- `apps/server` — Node 24, TypeScript strict, Apollo Server 4 standalone,
  SDL-first schema. Thin typed fetch clients for Open-Meteo geocoding, forecast
  and marine APIs (native fetch). Pure scoring engine + per-activity config,
  Vitest.
- `apps/web` — Vite + React + TypeScript, TanStack Query + graphql-request,
  plain CSS. Dev proxy `/graphql` → server, so no CORS handling.

Stack decisions and their trade-offs are recorded as ADRs when each slice lands
(ADR-001 Apollo Server, ADR-002 TanStack Query + graphql-request).

## API

```graphql
type Query {
  searchLocations(query: String!, limit: Int! = 5): [Location!]!
  activityForecast(latitude: Float!, longitude: Float!): ActivityForecast!
}

type Location { id: ID!  name: String!  region: String  country: String!  latitude: Float!  longitude: Float!  elevation: Float  population: Int }
type ActivityForecast { timezone: String!  elevation: Float!  days: [DayForecast!]! }
type DayForecast { date: String!  tempMax: Float!  tempMin: Float!  weatherCode: Int!  activities: [ActivityScore!]! }
type ActivityScore {
  activity: Activity!      # SKIING | SURFING | OUTDOOR_SIGHTSEEING | INDOOR_SIGHTSEEING
  status: ScoreStatus!     # SCORED | NOT_AVAILABLE
  score: Int               # null when NOT_AVAILABLE
  label: ScoreLabel        # EXCELLENT | GOOD | FAIR | POOR, null when NOT_AVAILABLE
  factors: [FactorScore!]!
  vetoes: [String!]!
}
type FactorScore { name: String!  value: Float  unit: String  score: Float!  weight: Float! }
```

Two-step on purpose: geocoding ambiguity becomes a product feature instead of
"first Springfield wins" roulette, and each query is independently testable.
The forecast resolver fetches the forecast and marine APIs in parallel and merges
them by local date (`timezone=auto` on both).

## Open questions → committed assumptions

Questions I'd normally take to a PM, with the assumption I committed to:

| Question | Committed assumption |
|---|---|
| Ski conditions at the town or at the nearest resort? | The town's own coordinates/elevation. Honest consequence: "Chamonix" in summer scores ~15, "no snow cover". Workaround: peaks/resorts geocode too — search them directly. Resort-proximity search is out of scope. |
| Scored for whom — beginners? experts? | General public / intermediate. E.g. waves >6 m cap the surf score as hazardous even though pros ride them. |
| Does "next 7 days" include today? | Yes: days 0–6, first column "Today", even though part of it is gone. |
| How many search candidates? | 5. |
| Units? | Metric, °C only. Toggle cut. |
| Sub-daily nuance ("rain only at 3 am")? | Daily aggregates only; a nighttime-rain day is penalized. Accepted trade-off for the budget. |

## Deliberate cuts

Caching/rate limiting, GraphQL codegen (stretch if time remains), wind
*direction* for surf (offshore detection needs coastline bearing),
nearby-resort search, hourly granularity, unit toggle, deploy, i18n, auth
(nothing to protect). Automated frontend tests were cut here originally and
reinstated in slice 4 (PR #4) after a browser-only bug escaped through that
exact gap.

## Process

`main` carries this spec. Three vertical slices, each a branch with a draft PR
used as a work log (hypothesis → what the AI proposed → what I accepted/rejected
→ how I validated → what I cut), merged in order:

1. `slice/scoring-engine` — engine + activity configs + tests + PDR-001 +
   validation-script output against known places (Ericeira surf, Madrid no-surf,
   Reykjavik, Dubai heat, a high-altitude point for snow).
2. `slice/graphql-api` — Apollo server, schema, resolvers, Open-Meteo clients +
   ADR-001, PDR-002 (ambiguity & not-available UX).
3. `slice/web-ui` — React app + ADR-002.
4. `slice/workspace-hardening` (added after the first submission pass) —
   apps/ workspace layout, frontend test suite, Node version pins, CI.

README written last: what this is, how to run it, assumptions.
