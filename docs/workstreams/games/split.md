# Game Workstream: The Split

## Owns

- `packages/games/split`
- `apps/web` route for the Split game UI

## Responsibilities

- implement multiplayer ultimatum gameplay with hidden-seat support
- expose structured fairness and acceptance metrics
- support human, LLM, and mixed-seat matches

## Design Focus

- simple room flow, strong readability, fast iteration
- excellent candidate for early deterministic tests

## Interfaces Needed

- contracts and seat abstractions from core platform
- LLM move runtime
- theme primitives

## Acceptance Criteria

- proposer and responder roles rotate correctly
- room handles mixed seat types without leaks
- replay and per-round metrics are deterministic

