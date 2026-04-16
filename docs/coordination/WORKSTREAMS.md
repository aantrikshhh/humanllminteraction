# Workstreams

Each workstream owns only the paths listed under `Owned Paths`. Shared contracts live in `packages/contracts`, `packages/game-sdk`, and the docs in this folder.

## Core Multiplayer + LLM Runtime

- Owned Paths: `apps/rooms`, `packages/contracts`, `packages/game-sdk`, `packages/agents`
- Consumes: shared context only
- Produces: room protocol, blinded seat model, replay/event schema, agent adapter interfaces
- Must Not Own: website copy, visual polish, game-specific UI details
- Done When: every downstream stream can build against stable shared contracts

## Website

- Owned Paths: `apps/web/app/(marketing)`, `apps/web/components/marketing`
- Consumes: theme tokens, product narrative, approved visual direction
- Produces: public landing pages, company-facing pitch pages, game catalog marketing pages
- Must Not Own: room lifecycle, authenticated app flows, leaderboard logic
- Done When: public site is navigable and consistent with the product story

## User Flow

- Owned Paths: `apps/web/app/(app)`, `apps/web/components/app-shell`
- Consumes: room protocol, theme primitives, leaderboard summary contracts, payments summary contracts
- Produces: onboarding, lobby, create/join room, ready-up, results, rematch, profile shell
- Must Not Own: marketing pages, game rules, rank calculation
- Done When: a player can enter a room and reach a game client shell

## Art Direction + Asset Governance

- Owned Paths: `packages/theme`, `docs/coordination/ASSET_GOVERNANCE.md`
- Consumes: approved art sources and product constraints
- Produces: theme tokens, sprite registry, asset manifest rules, credits workflow, cross-game UI direction
- Must Not Own: game logic, room logic
- Done When: all teams can build against a coherent art system and import assets safely

## Payments Stub

- Owned Paths: `apps/api/src/payments`, `apps/web/components/payments`
- Consumes: wallet and seat identity shell from user flow
- Produces: wallet connect stub, fake escrow states, payout ledger, payout status UI
- Must Not Own: real settlement contracts, live money movement
- Done When: demo rooms can show believable escrow and payout state without moving funds

## Leaderboard

- Owned Paths: `apps/api/src/leaderboard`, `apps/web/app/(app)/leaderboard`, `apps/web/components/leaderboard`
- Consumes: match result events and player identity shell
- Produces: rank updates, standings views, game filters, player summary slices
- Must Not Own: game rules, room orchestration
- Done When: match completion can update player rankings and render stable standings

## QA + CI

- Owned Paths: `tests`, workspace CI config
- Consumes: contracts and completed package surfaces from every stream
- Produces: room tests, simulation tests, browser E2E, smoke plans, load test plans
- Must Not Own: product behavior
- Done When: each stream has explicit test gates and the demo path is covered end to end

## Game: The Split

- Owned Paths: `packages/games/split`, `apps/web/app/(app)/games/split`
- Consumes: shared contracts, room runtime, theme tokens
- Produces: playable multiplayer implementation of the ultimatum-style game
- Must Not Own: cross-game lobby or room protocol
- Done When: two-seat blinded matches work for human or LLM-backed seats

## Game: The Pact

- Owned Paths: `packages/games/pact`, `apps/web/app/(app)/games/pact`
- Consumes: shared contracts, room runtime, theme tokens
- Produces: playable multiplayer iterated prisoner’s-dilemma-style game
- Must Not Own: cross-game lobby or room protocol
- Done When: repeated rounds, visible history, and hidden seat identities all work

## Game: The Vault

- Owned Paths: `packages/games/vault`, `apps/web/app/(app)/games/vault`
- Consumes: shared contracts, room runtime, theme tokens
- Produces: playable multiplayer public-goods plus free-rider detection game
- Must Not Own: cross-game lobby or room protocol
- Done When: 4-6 seat rounds, voting, and scoreboard telemetry all work

## Game: The Auction

- Owned Paths: `packages/games/auction`, `apps/web/app/(app)/games/auction`
- Consumes: shared contracts, room runtime, theme tokens
- Produces: flagship live multiplayer auction game
- Must Not Own: cross-game lobby or room protocol
- Done When: 3-5 seat live bidding, spectator clarity, and mixed human/LLM seats all work

## Game: The Settlement

- Owned Paths: `packages/games/settlement`, `apps/web/app/(app)/games/settlement`
- Consumes: shared contracts, room runtime, theme tokens, tilemap pipeline
- Produces: spatial multiplayer social-deduction game
- Must Not Own: core sprite pipeline or generic room orchestration
- Done When: a reduced MVP scope runs in rooms with a stable HUD and telemetry
