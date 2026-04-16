# Coordination Map

## Shared Vocabulary

- `seat`: a match participant slot
- `seat backing`: the hidden implementation behind the seat, such as `human`, `llm`, or future `scripted`
- `public room state`: the only state visible to clients and spectators
- `private room state`: server-only state including hidden identities, prompt versions, and internal timers
- `replay envelope`: canonical event log that reconstructs a finished match

## Ownership Boundaries

### Core Platform

- owns contracts under `packages/contracts`
- owns shared game interface under `packages/game-sdk`
- owns server-side room lifecycle in `apps/rooms`

### LLM Runtime

- owns `packages/agents`
- may not define client-visible game UI or alter public room schemas without contract review

### Website

- owns public marketing routes in `apps/web`
- may read leaderboard and asset metadata, but does not own room logic

### User Flow

- owns authenticated and session routes in `apps/web`
- may not bypass room protocol or persist hidden seat metadata to the client

### Art Direction

- owns `packages/theme`
- owns asset governance, manifest requirements, and credits surfaces

### Payments Stub

- owns `packages/payments`
- owns payout and escrow API contracts in `apps/api`

### Leaderboard

- owns `packages/leaderboard`
- owns ranking APIs and leaderboard UI surfaces

### QA / CI

- owns test conventions, shared fixtures, and CI pipelines

### Game Streams

- own only `packages/games/<game>`
- may consume the theme package and room contracts, but may not redefine them

## Dependency Rules

- game streams depend on `contracts`, `game-sdk`, `theme`, and `agents`
- website depends on `theme` and public API contracts only
- user flow depends on `theme`, public room protocol, leaderboard, and payments stubs
- leaderboard depends on `contracts`
- payments depends on `contracts`
- no stream writes directly into another stream's package without explicit review

## Required Coordination Artifacts

- contract changes must update `docs/implementation-plan.md`
- every stream brief must list:
  - owned files
  - blocked files
  - interfaces consumed
  - interfaces published
  - acceptance criteria

## Integration Rhythm

- integrate shared contracts first
- integrate `Auction` vertical slice second
- integrate remaining games only after the flagship room is stable
- do not merge a game package until replay tests and hidden-seat leak tests exist

