# Workstream Registry

This document exists so parallel agents can see ownership boundaries before writing code.

## Shared Rules

- Read [docs/implementation-plan.md](/Users/aant/repos/human-llm-interaction/docs/implementation-plan.md) first.
- Do not edit directories owned by another workstream.
- Treat `packages/contracts` as frozen unless the core stream approves a change.
- Use official docs or vendor pages when making unstable technical or licensing decisions.
- Log new interfaces and risks in your workstream notes before implementation.

## Registry

| Workstream | Owns | Depends On | Must Produce |
|---|---|---|---|
| Core Multiplayer + Runtime | `apps/rooms`, `packages/contracts`, `packages/game-sdk`, `packages/agents` | none | room protocol, blinded seat model, replay format, agent runtime contracts |
| Website | `apps/web/app/(marketing)` | theme tokens, public copy direction | marketing routes, credits page shell, public components |
| User Flow | `apps/web/app/(app)` non-game routes | contracts, theme tokens, payments, leaderboard | onboarding, lobby, room flow, results, rematch, profile shell |
| Art Direction + Asset Governance | `packages/theme` | approved source list | design tokens, asset manifest schema, credits pipeline |
| Payments Stub | `packages/payments`, payment UI/API surfaces | contracts, user flow | wallet stub, fake escrow, payout history |
| Leaderboard | `packages/leaderboard`, leaderboard UI/API surfaces | contracts, user flow | rating model, standings, match summary views |
| QA/CI | `tests` and CI docs | contracts, every implemented slice | room tests, replay tests, browser E2E, load tests |
| Game: Split | `packages/games/split`, `apps/web/app/games/split` | contracts, SDK, theme | full game slice plus tests handed to QA |
| Game: Pact | `packages/games/pact`, `apps/web/app/games/pact` | contracts, SDK, theme | full game slice plus tests handed to QA |
| Game: Vault | `packages/games/vault`, `apps/web/app/games/vault` | contracts, SDK, theme | full game slice plus tests handed to QA |
| Game: Auction | `packages/games/auction`, `apps/web/app/games/auction` | contracts, SDK, theme | flagship multiplayer demo slice |
| Game: Settlement | `packages/games/settlement`, `apps/web/app/games/settlement` | contracts, SDK, theme | reduced MVP spatial slice plus tests handed to QA |

## Acceptance Criteria By Stream

### Core Multiplayer + Runtime

- Room commands and events are versioned.
- Human and LLM seats are indistinguishable in public payloads.
- Replay reconstruction is deterministic.
- Games can plug in without patching the room core.

### Website

- Public routes explain the product clearly for both players and companies.
- Credits route is present and fed by asset metadata.
- Design stays consistent with the theme package.

### User Flow

- Room create, join, ready-up, disconnect, reconnect, results, and rematch all have explicit states.
- Mixed human/LLM seat rooms are supported without identity leaks.

### Art Direction + Asset Governance

- Every third-party asset has a manifest entry.
- Required attributions can be rendered automatically.
- One coherent visual language is enforced.

### Payments Stub

- No real money movement occurs.
- Fake escrow states are believable in the demo.
- Payout history is inspectable per player.

### Leaderboard

- Ratings update from match results.
- Match summaries can be filtered by game.
- Profile-level standing and history are available.

### QA/CI

- Every game has room tests, replay tests, and browser E2E.
- Mixed human/LLM room behavior is covered.
- Demo-day smoke checklist exists.

### Games

- Rules are server-authoritative.
- Telemetry and replay output match the shared contracts.
- UI stays within theme and asset rules.
- LLM seats can act through the shared agent interface.

