# Game Workstream: The Pact

## Owns

- `packages/games/pact`
- `apps/web` route for the Pact game UI

## Responsibilities

- implement multiplayer iterated prisoner's dilemma
- expose cooperation, retaliation, forgiveness, and end-game metrics
- support history visibility and mixed human/LLM seats

## Design Focus

- clear round history visualization
- readable state for spectators and players

## Interfaces Needed

- contracts and seat abstractions from core platform
- LLM move runtime
- theme primitives

## Acceptance Criteria

- simultaneous choices resolve correctly
- history display matches authoritative room state
- replay and behavioral metrics are deterministic

