# Game Workstream: The Settlement

## Owns

- `packages/games/settlement`
- `apps/web` route for the Settlement game UI

## Responsibilities

- implement the most visually rich multiplayer game in the set
- support spatial day phase, hidden sabotage, reveal, council discussion, and vote resolution
- expose movement, suspicion, and deception-detection metrics

## Design Focus

- Tiled map pipeline
- sprite readability
- structured council actions that remain testable

## Interfaces Needed

- contracts and seat abstractions from core platform
- LLM move runtime
- theme primitives and sprite registry

## Acceptance Criteria

- spatial state is synchronized authoritatively
- sabotage and vote flows remain deterministic
- replay and behavioral metrics are deterministic

