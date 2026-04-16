# Implementation Plan

## Objectives

- Ship a multiplayer-first platform where some seats are backed by hidden LLM players.
- Make the platform modular enough that game, platform, and art teams can work in parallel without breaking each other.
- Keep the MVP visually strong by using a coherent asset strategy instead of ad hoc assets.
- Make every game robustly testable with deterministic room logic, replay logs, and browser automation.

## Guiding Constraints

- Multiplayer is `P0`, not a stretch goal.
- Identity is hidden at the seat level: players should not know who is human or LLM during the match.
- The authoritative source of truth must live on the server.
- Every game must emit structured behavioral output.
- Every game must run in `human vs human`, `human vs LLM`, and `LLM vs LLM` modes.
- The first live demo should be a room-based game with strong spectator value. Current default: `The Auction`.

## Recommended Architecture

### Apps

- `apps/web`
  - Public website, onboarding, lobby, room join/create flow, profile, leaderboard, results, credits
- `apps/api`
  - Durable APIs for match records, payout stubs, leaderboard snapshots, player profiles, analytics export
- `apps/rooms`
  - Authoritative multiplayer room server
  - Matchmaking, timers, turn order, reconnects, state transitions, score finalization

### Shared Packages

- `packages/contracts`
  - Shared schemas for public room state, private seat metadata, messages, event logs, payouts, and leaderboard records
- `packages/game-sdk`
  - Deterministic game interface used by every game package
- `packages/agents`
  - LLM adapters, prompt/version registry, timeout policy, cost guardrails, synthetic seat orchestration
- `packages/theme`
  - Design tokens, UI primitives, asset registry, animation rules, future asset manifest
- `packages/payments`
  - Wallet stubs, escrow state machine, payout primitives
- `packages/leaderboard`
  - ELO/ranking primitives and read models

### Game Packages

- `packages/games/split`
- `packages/games/pact`
- `packages/games/vault`
- `packages/games/auction`
- `packages/games/settlement`

Every game package must expose:

- deterministic rules reducer
- room configuration
- seat and action validation
- public state serializer
- structured result serializer
- replay compatibility
- bot and fake-LLM hooks for tests

### Test Layers

- `tests/room`
  - room protocol, reconnects, invalid actions, timeouts
- `tests/simulations`
  - seeded bot and fake-LLM matches, regression tests
- `tests/e2e`
  - Playwright browser flows with multiple clients

## Shared Contract Freeze

Before feature branches fan out, lock these interfaces:

- `Seat`
- `PublicSeatView`
- `PrivateSeatMetadata`
- `AgentMoveRequest`
- `AgentMoveResult`
- `PublicRoomState`
- `ClientMessage`
- `ServerEvent`
- `MatchResult`
- `BehavioralOutput`
- `ReplayEnvelope`
- `LeaderboardEntry`
- `PayoutRecord`

This is the only deliberately serial step. Everything else should fan out after it.

## Parallel Workstreams

### Core Platform

- owns authoritative room model, protocol, shared contracts, deterministic replay
- publishes versioned interfaces used by every other stream

### LLM Runtime

- owns model adapters, seat orchestration, prompt versioning, latency normalization, failover

### Website

- owns public site and non-authenticated surfaces

### User Flow

- owns onboarding, room flow, post-match flow, profile shell

### Art Direction

- owns theme package, asset rules, sprite pipeline, credits policy

### Payments Stub

- owns wallet connect stub, escrow lifecycle, payout history

### Leaderboard

- owns ranking logic, leaderboard read APIs, leaderboard UX

### QA / CI

- owns shared testing policy, CI matrix, sharding, smoke suite

### Game Streams

- one stream each for `split`, `pact`, `vault`, `auction`, `settlement`
- each owns only its game package and associated game route

## Phase Plan

### Phase 0: Contract Freeze

- finalize repo layout
- freeze shared types and event shapes
- freeze room lifecycle
- freeze asset policy and tile sizing

### Phase 1: Foundation

- scaffold app shells and packages
- stand up room server and public website shells
- stand up fake auth and wallet stubs
- create ranking and payout stub interfaces

### Phase 2: Vertical Slices

- `Auction` as first flagship room demo
- then `Split` and `Pact`
- then `Vault`
- then `Settlement` after spatial stack is stable

### Phase 3: Hardening

- load tests
- reconnect tests
- hidden-seat leak checks
- attribution and compliance checks
- demo polish

## Acceptance Gates

- no client receives seat backing type metadata
- every room can be replayed deterministically from server events
- every game supports at least one multi-client E2E test
- room server remains authoritative under reconnects and partial fills
- room creation can backfill with hidden LLM seats if humans do not fill
- all third-party assets used by the demo are credited

