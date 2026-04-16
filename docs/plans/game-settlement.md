# Plan: The Settlement

## Scope

Own:

- `packages/games/settlement`
- `apps/web/app/(app)/games/settlement`

## MVP Constraint

Do not attempt the full long-form world simulation in the first pass. Build a reduced multiplayer slice that proves:

- top-down map movement
- one sabotage mechanic
- one reveal mechanic
- one council vote mechanic

## Rules Plan

- 4 to 5 seats
- day phase with map movement and resource pickup
- hidden sabotage phase handled server-side
- morning reveal
- council phase with structured actions only
- vote resolution

## Technical Plan

- use Tiled-authored maps exported to JSON
- keep movement server-authoritative
- keep council interactions menu-driven so they stay replayable and testable
- defer free-form chat until after the reduced MVP works

## Acceptance Criteria

- spatial state stays synchronized under replay
- sabotage and vote results are deterministic
- the reduced MVP is playable without custom map tooling beyond Tiled JSON
