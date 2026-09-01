# ADR-001 — GraphQL server: Apollo Server 4

Status: accepted

## Context

Two queries, no subscriptions, no auth: any spec-compliant server works.
Candidates: GraphQL Yoga (lighter, minimal setup, GraphiQL built in) and
Apollo Server 4 (heavier name, more ecosystem). The AI assistant recommended
Yoga; I overruled it.

## Decision

Apollo Server 4 in standalone mode, SDL-first (`schema.graphql` read at boot).

Reason: ecosystem maturity — the boring-technology argument. Documentation
depth, middleware/plugin surface, error-handling conventions
(`GraphQLError` + `extensions.code`), and the size of the community mean
fewer surprises and faster debugging under a time budget. For a service this
small, Yoga's lightness buys minutes; Apollo's ubiquity buys certainty.

## Consequences

- Slightly more dependency weight than Yoga for identical functionality here.
- `startStandaloneServer` keeps setup to a few lines, so the overhead is
  dependency size, not code.
- Error semantics follow Apollo conventions: upstream failures surface as
  `UPSTREAM_ERROR`, invalid coordinates as `BAD_USER_INPUT`.
