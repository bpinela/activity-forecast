# PDR-002 — Place ambiguity is a feature; "not a thing here" is a status

Status: accepted

## Context

"Springfield" matches dozens of places; a one-shot `activities(place)` API
would silently pick one. And a landlocked city has no surf — a score of 0
would imply "terrible waves today", which is wrong in kind, not degree.

## Decision

1. **Two-step API.** `searchLocations(query)` returns ranked candidates
   (name, region, country); the client picks one and calls
   `activityForecast(latitude, longitude)`. Ambiguity becomes a visible
   product feature, "no matches" is an empty list rather than an error, and
   each query is independently testable.
2. **`NOT_AVAILABLE` is a first-class status** on `ActivityScore`, distinct
   from any score. Surfing reports it when the marine grid has no wave data
   for the location (detected via nulls) — and also when the marine API
   itself fails, because losing an enrichment source should degrade one
   activity, not the whole forecast.

## Consequences

- The UI must handle candidate picking and a per-activity unavailable state
  (~30 min extra work, accepted at design review).
- `score`/`label` are nullable in the schema, guarded by `status`.
- A place very near the coast may still get `NOT_AVAILABLE` if its grid cell
  is inland — the marine grid resolution decides, not us. Accepted.
