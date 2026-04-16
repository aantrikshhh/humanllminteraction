# Architecture

## Product Shape

ARENA is a multiplayer game platform where each match is composed of blinded seats. A seat may be controlled by a human or an LLM-backed agent, but that backing type is hidden from all clients during play.

The architecture must optimize for:

- authoritative multiplayer rooms
- hidden human vs LLM identity
- deterministic match replay
- shared contracts across all games
- modular game packages that can be built in parallel
- a strong visual identity with governed third-party assets

## Top-Level Modules

### `apps/web`

Owns the browser application:

- marketing pages
- onboarding
- lobby and room browser
- room shell and game host pages
- results, leaderboard, and profile views
- credits page

### `apps/rooms`

Owns real-time multiplayer orchestration:

- room lifecycle
- ready-up and seat assignment
- reconnect handling
- authoritative timers
- validation of submitted moves
- room closeout and result emission

### `apps/api`

Owns durable application APIs:

- match summaries
- leaderboard projections
- payout history and escrow stubs
- analytics exports
- LLM seat configuration metadata

### `packages/contracts`

Owns the shared protocol surface:

- public and private seat shapes
- room message envelopes
- replay event types
- match result schema
- leaderboard entry schema
- payout ledger events

### `packages/game-sdk`

Owns the common game interface. Every game must plug into the same primitives:

- `GameDefinition`
- `GameState`
- `GameAction`
- `PublicGameView`
- `PrivateSeatContext`
- `Reducer`
- `ReplaySerializer`
- `TelemetryEmitter`

### `packages/agents`

Owns LLM seat execution:

- model registry
- provider adapters
- prompt versions
- move-request interface
- retries and timeouts
- deterministic fake agent for CI

### `packages/theme`

Owns the shared visual language:

- design tokens
- UI primitives
- asset manifest
- credits manifest
- sprite atlas registry
- animation rules

### `packages/payments`

Owns demo fidelity for blockchain-like rewards:

- wallet connect stub
- fake escrow lifecycle
- payout status machine
- transaction history projection

### `packages/leaderboard`

Owns ranking logic and read models:

- per-game rating updates
- cross-game standings
- player summaries
- match history projections

### `packages/games/*`

Each game owns only its own rules, state machine, UI, and telemetry mapping.

## Core Domain Model

### Blinded Seats

All gameplay surfaces operate on seats, not players:

- `seatId`
- public display metadata
- readiness state
- current score and public status

The true backing type stays private:

- `human`
- `llm`
- `scripted`

Clients must never receive provider or model metadata in room payloads.

### Match Replay

Every room emits an append-only event log:

- room created
- seat joined
- seat ready
- turn opened
- action submitted
- action resolved
- result posted
- rematch requested

This replay log is the basis for:

- debugging
- analytics
- deterministic tests
- post-match summaries

### Public vs Private State

Each game must support:

- `publicGameView`: visible to all seats and spectators
- `privateSeatContext`: visible only to the acting seat or server
- `privateExperimentMetadata`: visible only to server-side analytics

## Visual System

The house style is `Kenney-first competitive pixel tactics`.

Use:

- Kenney as the primary asset base
- 0x72, ansimuz, and selected OpenGameArt only as governed supplements
- a single tile size and palette family per gameplay scene
- a generated credits surface for every third-party asset used

## Technical Boundaries

The fastest safe split is:

- `apps/web` for the browser shell
- `apps/rooms` for persistent real-time state
- `apps/api` for durable reads/writes and external integrations

Do not collapse all of this into one process. The real-time room layer is the critical multiplayer boundary and should stay isolated.
