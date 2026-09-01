# PDR-001 — Scoring model: weighted trapezoid factors + veto caps

Status: accepted

## Context

The product needs one comparable answer per activity per day ("rank the next 7
days"), built from heterogeneous measurements (meters of waves, °C, km/h, WMO
codes). Alternatives considered: rule-based tiers (too coarse to rank days —
ties everywhere) and penalty subtraction (same math as weights with the
trade-offs hidden inside penalty sizes).

## Decision

Each activity defines weighted factors. A factor maps one daily measurement to
0–1 through a trapezoid "ideal range" curve; the day's score is
`round(100 × Σ weight · factor)`; vetoes then cap the score with a
human-readable reason. A shared 0–100 scale and diverging bands (Great ≥80, Good ≥60,
Fair ≥40, Poor ≥20, Bad <20) keep activities and days comparable; five steps
because the diverging color scale in the UI needs a true "bad" pole, not just
a pale "poor". Exact curves, weights
and vetoes live in `server/src/scoring/activities.ts` — the config table is the
source of truth; this document records why.

Key sub-decisions:

- **Essential factors are vetoes, not just low weights.** Caught by a scenario
  test: a flat ocean (0.1 m) scored 59 because glassy wind, decent period and
  sunshine compensated for the missing waves. Wave height < 0.3 m now caps at
  10. Same logic: no snow cover caps skiing at 15, thunderstorms cap all
  outdoor activities (lightning caps surfing at 10).
- **Indoor sightseeing is the complement of outdoor comfort**:
  `100 − 0.5 × outdoor`, living in [50..100]. Museums are always a viable
  option, and they shine exactly when outside is miserable. One line, fully
  explainable in the UI.
- **Missing measurements renormalize.** A factor without data is skipped and
  the remaining weights are rescaled — partial truth beats a fabricated
  neutral value. No data at all → NOT_AVAILABLE, a distinct status the UI
  renders as "not a thing here", never as 0/100.
- **Scored for the general public**, not experts: waves above 6 m cap as
  hazardous even though professionals ride them.

## Validation (live data, 2026-08-31 — see scoring PR for full table)

- Ericeira: surf 77–83 on a real 1.6–1.9 m week; Madrid: surf NOT_AVAILABLE.
- Madrid/Dubai heat (≥38 °C): outdoor capped at 30, indoor rises to 85+;
  Dubai's thunderstorm day: surf 10, outdoor 15, indoor 93.
- Zermatt (1608 m): ski 52–57 when September snowfall enters the forecast —
  the model distinguishes early-season conditions without hand-tuning.

## Known limitations (accepted)

- Scores use the place's own grid cell/elevation; there is no nearest-resort
  or nearest-break search. Searching the mountain or the surf town directly
  works ("Zermatt", "Ericeira").
- Open-Meteo `snow_depth` models seasonal snowpack, not glacier ice: Zugspitze
  (2962 m) reports 0 m in late summer, so summer glacier skiing never scores.
  Verified against the raw API before deciding this is upstream, not us.
- Daily aggregates only: rain at 3 am penalizes the whole day.
- Wind direction is ignored for surf (offshore detection needs coastline
  bearing — out of scope).
- Weights encode judgment, not physics. They were sanity-checked against known
  places, not fitted to data.
