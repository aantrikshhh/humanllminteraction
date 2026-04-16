# Workstreams

## Coordination rules

- Every stream must treat `packages/contracts` as the source of truth.
- Streams should not edit another stream's owned package without explicit reassignment.
- Game packages may depend on shared packages, but shared packages must not depend on game packages.
- UI identity must remain consistent across games through `packages/theme`.
- Credits and asset licensing are a build requirement, not cleanup work.

## Ownership map

| Stream | Primary ownership | Can consume | Must not own |
|---|---|---|---|
| Core Multiplayer + LLM Runtime | `packages/contracts`, `packages/game-sdk`, `packages/agents`, room protocol notes | all game packages, `apps/rooms`, `apps/api` | marketing pages, game-specific UI, leaderboard views |
| Website | `apps/web/app/(marketing)` | `packages/theme` | room logic, player app flow |
| User Flow | `apps/web/app/(app)` shell and non-game routes | `packages/contracts`, `packages/theme`, room APIs | marketing pages, game reducers |
| Art Direction + Asset Governance | `packages/theme`, asset manifest, credits registry | approved source packs | room logic, scoring, leaderboard rules |
| Payments Stub | `packages/payments`, payout stub API notes | `packages/contracts` | real money movement, on-chain logic |
| Leaderboard | `packages/leaderboard`, leaderboard views and APIs | `packages/contracts`, match results | room state, payment flows |
| QA/CI | `tests/*`, CI guidance | all packages via tests | product logic ownership |
| Game: Split | `packages/games/split` | all shared packages | other games |
| Game: Pact | `packages/games/pact` | all shared packages | other games |
| Game: Vault | `packages/games/vault` | all shared packages | other games |
| Game: Auction | `packages/games/auction` | all shared packages | other games |
| Game: Settlement | `packages/games/settlement` | all shared packages | other games |

## Shared handoff artifacts

Every stream should produce:

- implementation scope
- dependency list
- owned file/module list
- acceptance criteria
- unresolved questions that would block code

Every game stream should also produce:

- state machine outline
- public vs private state split
- room action contract
- telemetry contract
- LLM seat behavior notes
- test matrix

## Interface dependency order

1. Core defines contracts.
2. Theme defines shared tokens and asset manifest schema.
3. User Flow and Website consume theme.
4. Game packages consume contracts, SDK, agents, and theme.
5. Leaderboard and Payments consume match outputs from contracts.
6. QA consumes all of the above but owns only tests.
