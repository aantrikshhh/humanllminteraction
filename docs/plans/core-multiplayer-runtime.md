# Core Multiplayer Runtime Plan

## Scope

Own:

- `apps/rooms`
- `packages/contracts`
- `packages/game-sdk`

Do not own:

- provider-specific LLM adapters
- game-specific reducers
- website or player-flow pages

## Research-Backed Choices

- Use a separate authoritative room server instead of folding multiplayer into a custom Next.js server. References:
  - `https://nextjs.org/docs/pages/guides/custom-server`
  - `https://docs.colyseus.io/concepts`
  - `https://docs.colyseus.io/learn/tutorial/phaser`
  - `https://docs.colyseus.io/deployment`
- Standardize every game as a deterministic reducer that emits replay events and public projections.
- Keep clients limited to public room state only.

## Module Plan

- `packages/contracts`
  - freeze room and replay envelopes
  - freeze public/private seat shapes
  - freeze match result and leaderboard event payloads
- `packages/game-sdk`
  - expose one reducer-compatible game module interface
  - standardize timer config, reducer context, reducer result, and finalization
- `apps/rooms`
  - implement join, ready, active, results, closed lifecycle
  - support room code creation, reconnect, rematch, timeout, and LLM seat backfill orchestration
  - register games by `GameKey`

## Integration Contracts Published

- `PublicRoomState`
- `ClientMessage`
- `ServerEvent`
- `ReplayEnvelope`
- `MatchResult`
- `GameModule`

## Acceptance Criteria

- mixed human/LLM rooms can be hosted without leaking seat backing type
- every game package plugs in through the shared SDK without patching room core
- replay logs reconstruct final state deterministically
- reconnect and rematch logic are shared runtime behavior, not per-game behavior

## Risks

- identity leaks through room system messages
- reducer drift between replay and room snapshots
- game teams attempting to bypass the reducer interface
