# ARENA Implementation Plan

## Objective

Build a multiplayer web platform where humans and LLM-backed seats play structured competitive games without revealing which seats are human or synthetic. The platform must be modular enough for parallel delivery across website, multiplayer runtime, game packages, payments stubs, leaderboard, and test infrastructure.

## Execution Model

### Phase 0: Contract Freeze

Freeze these interfaces before parallel implementation starts:

- `Seat` and `PublicSeatView`
- `PrivateSeatMetadata`
- `Room message envelope`
- `Replay event format`
- `Match result envelope`
- `Leaderboard update event`
- `Payout ledger event`
- `Asset manifest entry`

### Phase 1: Foundation

Run these streams first, in parallel:

- Core multiplayer runtime
- LLM runtime
- Website
- User flow
- Art direction and asset governance
- Payments stub
- Leaderboard
- QA and CI

### Phase 2: Game Packages

Run one stream per game:

- The Split
- The Pact
- The Vault
- The Auction
- The Settlement

Every game stream consumes the shared contracts, room lifecycle model, and theme tokens.

### Phase 3: Integration

Merge only green vertical slices. The flagship demo should be `The Auction` because it is visibly multiplayer, supports mixed human and LLM seats, and does not require the spatial complexity of `Settlement`.

## Non-Negotiable Constraints

- Multiplayer is `P0`, not post-MVP.
- Rooms are server-authoritative.
- Seat backing type stays private to the server.
- Every game must support human-only, mixed human/LLM, and LLM-only rooms.
- Every game emits deterministic replay logs.
- Art must stay visually coherent and credit all approved third-party sources.
- Tests must cover room logic, replay determinism, browser flows, and mixed-seat behavior.

## Target Repo Shape

```text
apps/
  api/
  rooms/
  web/
docs/
  coordination/
  plans/
packages/
  agents/
  contracts/
  game-sdk/
  theme/
  games/
    auction/
    pact/
    settlement/
    split/
    vault/
tests/
  e2e/
  room/
  simulations/
```

## Working Rule

Each parallel stream owns a small, explicit slice of the tree. Shared interfaces change only through the contract freeze docs in `docs/coordination`.
