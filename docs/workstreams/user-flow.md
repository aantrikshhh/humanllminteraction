# User Flow Workstream

## Owns

- app routes in `apps/web` for onboarding, lobby, room join/create, results, and profile shell

## Must Not Own

- room server logic
- provider adapters
- ranking formulas

## Responsibilities

- design end-to-end session flow
- support private room links and match configuration
- support partial rooms that backfill with hidden LLM seats
- build result and rematch flows

## Research Focus

- lobby UX for multiplayer games
- reconnect and error recovery UX
- room readiness and seat assignment UX without identity leaks

## Interfaces Needed

- public room protocol
- payments and leaderboard read models
- theme primitives

## Acceptance Criteria

- player can create or join a room, play, see results, and rematch
- UI does not leak whether a seat is human or LLM
- room flow degrades cleanly when seats disconnect or are backfilled

