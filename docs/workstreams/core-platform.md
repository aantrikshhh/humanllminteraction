# Core Platform Workstream

## Owns

- `apps/rooms`
- `packages/contracts`
- `packages/game-sdk`

## Must Not Own

- public marketing pages
- payout implementation details
- leaderboard UX
- game-specific rules beyond shared interfaces

## Responsibilities

- design the authoritative room server
- define versioned contracts for public and private room state
- define the deterministic game plugin interface
- define replay/event log structures
- define reconnect, ready-up, turn timeout, and rematch rules

## Research Focus

- Colyseus room lifecycle and testing
- room sharding and presence
- deterministic reducers and replay patterns
- server-authoritative messaging for hidden-seat multiplayer

## Interfaces Published

- seat and room schemas
- room message protocol
- replay envelope
- game package interface

## Dependencies

- none internally beyond chosen runtime stack

## Acceptance Criteria

- contracts are frozen and documented
- room server can host mixed human/LLM matches without leaking backing type
- all game packages can register via the shared SDK
- replay logs can reconstruct final state deterministically

