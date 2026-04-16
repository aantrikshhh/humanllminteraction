# Game Workstream: The Vault

## Owns

- `packages/games/vault`
- `apps/web` route for the Vault game UI

## Responsibilities

- implement multiplayer public-goods gameplay with contribution and accusation phases
- expose contribution and free-rider detection metrics
- support 4 to 6 seats with hidden human/LLM mix

## Design Focus

- phase clarity
- vote and reveal handling
- visible score deltas without revealing hidden internal state

## Interfaces Needed

- contracts and seat abstractions from core platform
- LLM move runtime
- theme primitives

## Acceptance Criteria

- phase transitions are deterministic
- accusation and scoring logic are authoritative
- replay and behavioral metrics are deterministic

