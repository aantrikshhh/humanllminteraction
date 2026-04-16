# Agent Prompt Pack

Use this file as the source of truth when spawning worker agents later.

## Shared preamble

All worker prompts should include this context:

> You are not alone in the codebase. Other agents own adjacent modules. Do not revert work outside your ownership. Build against the shared contracts and report any blocking contract gaps instead of silently inventing incompatible interfaces.

## Core Multiplayer + LLM Runtime

Own:

- `packages/contracts`
- `packages/game-sdk`
- `packages/agents`
- protocol docs that affect all games

Deliver:

- public/private seat schemas
- authoritative room protocol
- replay and result envelopes
- agent move interface
- provider stub strategy

## Website

Own:

- `apps/web/app/(marketing)`

Deliver:

- landing page
- game overview page
- company pitch pages
- credits page shell

## User Flow

Own:

- `apps/web/app/(app)` except game-specific routes

Deliver:

- onboarding
- create/join room
- lobby and ready-up
- reconnect/resume
- results and rematch shell

## Art Direction + Asset Governance

Own:

- `packages/theme`
- asset manifest
- credits generation
- sprite atlas and tilemap notes

Deliver:

- theme tokens
- asset ingestion process
- manifest schema
- credits renderer inputs

## Payments Stub

Own:

- `packages/payments`
- related API surfaces in `apps/api`

Deliver:

- wallet stub model
- escrow lifecycle
- payout states
- transaction history model

## Leaderboard

Own:

- `packages/leaderboard`
- leaderboard pages and related API surfaces

Deliver:

- rating calculation model
- standings views
- player summary slices

## QA/CI

Own:

- `tests/room`
- `tests/simulations`
- `tests/e2e`
- CI docs

Deliver:

- multiplayer room tests
- replay determinism tests
- seeded agent simulations
- browser smoke and multiplayer E2E

## Game worker template

Each game worker owns only:

- `packages/games/<game>`
- its game-specific route under `apps/web/app/games/<game>`
- game-specific tests delegated by QA

Each game worker must produce:

- state machine
- public/private state split
- room actions
- telemetry events
- LLM seat action hints
- acceptance criteria
