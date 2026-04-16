# Shared Context

## Product Summary

ARENA is a multiplayer web platform for structured competitive games. Seats in a room can be backed by humans or LLM agents, but the room must not reveal which is which during play. The product creates gameplay, telemetry, and experiment data at the same time.

## Core Requirements

- Multiplayer rooms are part of the MVP.
- Mixed human and LLM rooms are part of the MVP.
- One flagship live demo game must be production-ready enough to show on stage.
- Other games should be designed as modular packages that fit the same multiplayer runtime.
- The platform must look deliberate and attractive, not like a placeholder dashboard.

## Architecture Direction

- `apps/web`: marketing site, lobby, room entry, results, leaderboard, player profile shell
- `apps/rooms`: authoritative multiplayer room server
- `apps/api`: durable APIs for session metadata, payments stub, leaderboard snapshots, and analytics export
- `packages/contracts`: runtime-safe shared schemas and core event types
- `packages/game-sdk`: shared interfaces that every game package implements
- `packages/agents`: model adapters, prompts, timeouts, budget and retry logic
- `packages/theme`: theme tokens, asset manifest, UI primitives, sprite registry
- `packages/games/*`: one package per game

## Cross-Cutting Invariants

- Clients only receive public seat data.
- Private seat metadata lives server-side only.
- LLM seat timing must be normalized enough to avoid obvious identity leaks.
- Every match writes both a public replay log and a private experiment log.
- All game rules must be deterministic under replay.
- Art licensing must be tracked per imported asset or pack.

## Demo Focus

The default flagship demo is `The Auction`:

- clearly multiplayer
- high spectator value
- mixed human and LLM seats are easy to explain
- lower scope than `Settlement`

## Approved Asset Direction

- Base style: Kenney-first pixel tactics
- Approved supplements: 0x72 DungeonTileset II, 0x72 DungeonUI, ansimuz top-down collection, selective OpenGameArt assets
- Credit all supplements even when attribution is optional

## Mandatory Test Modes

- human vs human
- human vs LLM
- LLM vs LLM
- reconnect and rematch behavior
- deterministic replay verification
