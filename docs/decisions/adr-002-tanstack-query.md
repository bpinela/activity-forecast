# ADR-002 — Frontend data layer: TanStack Query + graphql-request

Status: accepted

## Context

The UI issues two read-only queries (location search, activity forecast). No
mutations, no shared entities across views, no optimistic updates. Candidates:
Apollo Client (normalized cache, the default GraphQL pairing), urql (lighter
GraphQL-native), TanStack Query + graphql-request (cache by query key, GraphQL
as plain requests).

## Decision

TanStack Query + graphql-request.

A normalized entity cache is dead weight when no entity is ever read from two
places: cache-by-query-key is exactly the right granularity for
"search results for “eri”" and "forecast for (lat, lon)". TanStack Query also
carries the request lifecycle the UI actually needs (debounced dependent
queries, `enabled`, stale times, retry, error/loading states) with less API
surface than Apollo Client.

## Consequences

- Response types are hand-written (`web/src/api/types.ts`) and mirror the SDL;
  GraphQL Code Generator was the stretch upgrade and was cut for the budget —
  with two queries the drift risk is small and caught by manual QA.
- If the app grew mutations or cross-view entity sharing, this decision should
  be revisited before workarounds accumulate.
