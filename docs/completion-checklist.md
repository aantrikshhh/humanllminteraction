# ARENA Completion Checklist

This document is the execution checklist for taking the current scaffold to a genuinely finished ARENA product. It is grounded in the current repo shape, not the original pitch alone.

## Current Baseline

The repository already has the following in place:

- a monorepo with `apps/web`, `apps/rooms`, `apps/api`, shared packages, and five game packages
- an in-memory authoritative room runtime in `apps/rooms` with registered modules for `auction`, `split`, `pact`, `vault`, and `settlement`
- a demo operator lobby in `apps/web` with room creation and Auction interaction
- in-memory leaderboard and payments engines exposed through `apps/api`
- deterministic game packages and smoke-test coverage for the initial game slices
- asset policy and third-party asset tracking scaffolds

What is still missing is the work that turns this from a scaffolded demo platform into a complete product: live multiplayer transport, full room UX, automatic results propagation, persistence, analytics, moderation, deployment, and production-grade operations.

## How To Use This Checklist

- Treat `Near-Term MVP` as the shortest path to a convincing live product and stage demo.
- Treat `Beta Hardening` as the work required before outside testers or research partners can rely on it.
- Treat `Production-Ready` as the work required for a durable public product with real payouts and operational ownership.
- Use the dependency notes before spawning new workers. Maximum parallelism is useful only after the contracts and runtime seams are stable.

## Serial Blockers And Parallelism Rules

These items should be treated as shared blockers. Do not fan out dependent work until they are explicitly stable.

### Shared blockers

- Freeze the room transport decision and connection model.
  - Choose the live room transport and deployment shape for `apps/rooms`.
  - Acceptance: one documented and implemented path for create, join, reconnect, leave, rematch, and spectator sync.
- Freeze the public/private seat contract.
  - Confirm exactly which fields are public, seat-private, and experiment-private.
  - Acceptance: no page or API depends on hidden backing-type metadata.
- Freeze the room result emission contract.
  - Define the canonical handoff from `apps/rooms` to leaderboard, payments, analytics, and match history.
  - Acceptance: a finished room emits one stable match-complete payload plus replay reference.
- Freeze the identity/session model.
  - Decide how `playerId`, invite links, wallet-bound sessions, and anonymous demo sessions coexist.
  - Acceptance: room joins, leaderboard attribution, and payout attribution all use the same player identity rules.
- Freeze the asset manifest and credits generation format.
  - Acceptance: all third-party imports can be represented without ad hoc fields.

### Safe parallel work after blockers are stable

- game-specific UI and reducers
- marketing site and game catalog content
- leaderboard math and presentation
- payments stub UI and state machine
- art direction, sprite normalization, and credits ingestion
- browser test scaffolding
- deployment manifests and environment setup

### Work that stays blocked until runtime integration is stable

- live room pages for non-Auction games
- automatic result propagation into leaderboard and payouts
- reconnect/rematch E2E coverage
- moderation actions tied to real player identities
- production analytics and experiment dashboards

## Near-Term MVP

This is the shortest complete product slice. It should end with one flagship multiplayer game that works live, supports hidden human-vs-LLM seats, looks deliberate, and updates downstream surfaces automatically.

### 1. Core Multiplayer Runtime

- [ ] Replace the demo-only room interaction seam with a full live room transport.
  - Suggested order: transport first, then reconnect, then spectator sync.
  - Depends on: room transport decision.
  - Acceptance: two real browsers can join the same room, stay in sync, and recover from a tab refresh.
- [ ] Implement canonical room lifecycle transitions.
  - Include: create, join, invite/private join, ready, active play, result, rematch, close.
  - Acceptance: every room follows the same lifecycle and emits replay-safe events for each transition.
- [ ] Add durable room persistence and replay storage.
  - Store room metadata, replay logs, and final result payloads.
  - Acceptance: a completed room can be reloaded after process restart.
- [ ] Add seat reservation and partial-fill logic.
  - Include human-only rooms, mixed rooms, and auto-fill with hidden LLM seats.
  - Acceptance: if a room does not fill with humans in time, the runtime can backfill with LLM seats without exposing that fact.
- [ ] Add reconnect and timeout handling.
  - Include grace periods, absent-seat fallback, and room closeout rules.
  - Acceptance: a disconnect during play does not corrupt the room and does not leak seat backing type.
- [ ] Emit one finalized result package per match.
  - Include match result, replay reference, seat-to-player mapping, and experiment metadata pointer.
  - Acceptance: leaderboard and payments can consume room completion without scraping runtime internals.

### 2. Hidden Human-vs-LLM Seat Runtime

- [ ] Expand `packages/agents` from fake runtime to real provider-backed adapters.
  - Include model registry, prompt version registry, retries, timeouts, and budget controls.
  - Acceptance: at least one real LLM provider plus the deterministic fake adapter can drive a seat.
- [ ] Normalize timing and presentation to avoid identity leaks.
  - Include bounded response delays, consistent ready indicators, and no provider-specific UI tells.
  - Acceptance: room payloads and UI never reveal whether a seat is human or LLM.
- [ ] Add seat composition controls for demo and operations.
  - Include room templates such as `2 humans + 2 hidden LLMs`.
  - Acceptance: operators can reliably stage mixed multiplayer demos.
- [ ] Persist private experiment metadata separately from public room state.
  - Include model id, prompt version, latency, token usage, and failure metadata.
  - Acceptance: public replay is blind; experiment logs remain queryable server-side.

### 3. Flagship Game: Auction

- [ ] Finish the full live Auction room experience.
  - Include join/create flow, live room page, ready-up, active play, spectator-safe display, results, and rematch.
  - Depends on: core runtime transport.
  - Acceptance: one human can join from the web app, hidden LLM seats can fill the room, and the match plays to completion live.
- [ ] Add stage-demo orchestration for Auction.
  - Include pre-seeded room templates, operator controls, and a stable demo script.
  - Acceptance: the team can run the same mixed-seat Auction demo repeatedly with predictable behavior.
- [ ] Polish Auction presentation.
  - Include scene art, motion, sound cues if desired, and spectator-readable information hierarchy.
  - Acceptance: the flagship game no longer looks like a developer console.

### 4. User Flow And Product Shell

- [ ] Finish onboarding and join flows.
  - Include anonymous demo path, invite link path, and re-entry path.
  - Acceptance: a new user can reach a room without operator intervention.
- [ ] Build the canonical live room shell in `apps/web`.
  - Include room header, seat list, connection state, timer, action controls, chat or reaction policy if used, and result transition.
  - Acceptance: all live games can reuse the same shell.
- [ ] Build post-match results and profile entry points.
  - Include leaderboard delta, payout preview, replay link, and next action.
  - Acceptance: every finished match lands on a coherent result screen instead of dropping the user back into the lobby.
- [ ] Add player profile pages with match history and rating summary.
  - Acceptance: a player can inspect performance across games from one stable route.

### 5. Leaderboard

- [ ] Wire room completion into automatic leaderboard updates.
  - Depends on: finalized room result contract.
  - Acceptance: after a match completes, the affected human players appear with updated ratings.
- [ ] Build the complete leaderboard UX.
  - Include global board, per-game board, player drill-down, rank deltas, and empty states.
  - Acceptance: the leaderboard reads as a product feature, not raw JSON surfaced through a page.
- [ ] Enforce public/private ranking rules.
  - Public boards should list humans only.
  - Mixed human/LLM matches should still affect human ratings.
  - Acceptance: no public board leaks hidden seat identities.

### 6. Payments Stub

- [ ] Wire room completion into automatic payout stub generation.
  - Depends on: finalized room result contract and seat-to-player mapping.
  - Acceptance: a qualifying finished match creates settlement and payout records without manual actions.
- [ ] Build the usable wallet and payout UX.
  - Include connect stub, escrow state timeline, payout claim, transaction history, and explicit simulated labels.
  - Acceptance: a user can understand the payout flow end to end from the web app.
- [ ] Decide the MVP payout policy.
  - Include whether only specific games pay, whether all seats stake, and how ties or abandoned rooms resolve.
  - Acceptance: the product has one documented and implemented payout policy for demo and testing.

### 7. Visual Direction, Assets, And Credits

- [ ] Convert the current visual shell into one cohesive house style.
  - Use Kenney-first art with approved supplements only where they clearly fill gaps.
  - Acceptance: marketing pages, lobby, live room shell, and flagship game feel like one product family.
- [ ] Create the real asset manifest and credits generation pipeline.
  - Include manifest validation, generated credits page, and repo ledger updates.
  - Depends on: asset manifest format freeze.
  - Acceptance: every imported third-party asset is credited correctly in the app and repo.
- [ ] Import and normalize approved supplemental packs as needed.
  - Approved supplements: `0x72 DungeonTileset II`, `0x72 DungeonUI`, `ansimuz top-down collection`, and selected `OpenGameArt` assets with per-asset attribution.
  - Acceptance: no mixed-screen asset usage ships without palette, tile-size, and line-weight normalization.

### 8. Analytics And Experiment Data

- [ ] Add public replay retrieval backed by durable storage.
  - Acceptance: the app can show or download a replay for a completed match.
- [ ] Add private experiment logging for human-vs-LLM benchmarking.
  - Include seat backing type, model details, prompts, latencies, outcomes, and behavioral outputs.
  - Acceptance: one completed match produces data usable for later benchmark analysis.
- [ ] Add a first analytics export surface in `apps/api`.
  - Acceptance: operators can query recent matches and experiment records without touching runtime memory.

### 9. Testing And Quality Gates

- [ ] Make the CI gates real and blocking.
  - Include `typecheck`, `test`, `build`, and at least one end-to-end smoke run.
  - Acceptance: merging cannot bypass the main runtime, game, or web checks.
- [ ] Add multi-client browser tests for the flagship game.
  - Include create, join, ready, gameplay, result, and rematch or closeout.
  - Acceptance: two-browser or multi-context Auction flow passes consistently.
- [ ] Add hidden-seat leak tests.
  - Include API payload assertions and UI-state checks.
  - Acceptance: no public payload contains backing-type, model, or prompt metadata.
- [ ] Add replay determinism tests for every live game.
  - Acceptance: replaying a saved event log reproduces the same result.

### 10. MVP Deployment And Demo Ops

- [ ] Choose the initial hosting stack for `web`, `api`, and `rooms`.
  - Acceptance: one documented environment topology exists for local, preview, and production-like demo deploys.
- [ ] Add environment management and secrets handling.
  - Include LLM API keys, signing keys, and runtime base URLs.
  - Acceptance: the stack can be deployed without hand-editing code.
- [ ] Create a demo runbook.
  - Include how to start services, seed demo rooms, recover from failure, and verify credits and payouts.
  - Acceptance: a non-author operator can run the demo from a checklist.

## Beta Hardening

This phase makes the platform stable enough for repeated external usage, research sessions, and internal iteration without operator babysitting.

### 1. Bring The Other Games Live

- [ ] Integrate `Split` into the live room shell and runtime end to end.
- [ ] Integrate `Pact` into the live room shell and runtime end to end.
- [ ] Integrate `Vault` into the live room shell and runtime end to end.
- [ ] Integrate `Settlement Lite` into the live room shell and runtime end to end.
- [ ] Add game-specific result views and replay renderers for each game.
- [ ] Add balancing and rules reviews based on actual play logs.

Acceptance:

- every shipped game can be created from the lobby
- every shipped game supports mixed human/LLM rooms
- every shipped game completes, persists results, and updates leaderboard and payouts as configured

### 2. Identity, Sessions, And Accounts

- [ ] Replace demo-player shortcuts with a real player session model.
- [ ] Decide whether accounts are email-based, wallet-first, or hybrid.
- [ ] Add session recovery and invite ownership rules.
- [ ] Add profile editing, avatar policy, and display-name uniqueness rules.

Acceptance:

- a returning player can recover identity, room history, and rankings
- room invitations and payouts bind to the correct player account

### 3. Persistence And Data Model Maturity

- [ ] Move leaderboard and payments from in-memory-only to persistent backing stores.
- [ ] Add migrations or equivalent schema-management workflow.
- [ ] Add retention rules for replays and experiment logs.
- [ ] Add backfill or repair tools for incomplete room settlements.

Acceptance:

- process restarts do not lose player, match, payout, or leaderboard state

### 4. Moderation, Trust, And Abuse Controls

- [ ] Add reporting flows for abusive names, harassment, and suspicious behavior.
- [ ] Add operator moderation tools for player suspension, room shutdown, and replay review.
- [ ] Add rate limiting and abuse controls for room creation, join spam, and API misuse.
- [ ] Add content and prompt-safety policy for LLM seat outputs if free text is ever surfaced.

Acceptance:

- operators can remove bad actors and review incidents without touching production databases directly

### 5. Observability And Reliability

- [ ] Add structured logging across `web`, `api`, `rooms`, and agent runtime.
- [ ] Add error monitoring and alerting.
- [ ] Add service health dashboards and basic SLO targets.
- [ ] Add load and soak tests for concurrent rooms.
- [ ] Add backup and restore procedures for persistent stores.

Acceptance:

- the team can diagnose room failures, payout failures, and LLM failures from logs and dashboards

### 6. Analytics, Research, And Internal Tools

- [ ] Add match search and experiment exploration tools for operators.
- [ ] Add benchmark export pipelines suitable for company/research reporting.
- [ ] Add cohort and provider comparison views for hidden-seat experiments.
- [ ] Add privacy review for experiment data collection and export.

Acceptance:

- the product can produce useful human-vs-LLM evaluation outputs without manual log digging

### 7. Security And Compliance Baseline

- [ ] Threat-model the multiplayer, LLM, payout, and analytics surfaces.
- [ ] Add authentication, authorization, and secret-rotation policy.
- [ ] Review data exposure boundaries for public vs private match data.
- [ ] Add legal pages that match actual data handling and payout behavior.

Acceptance:

- the platform has a documented minimum security posture and no known public/private data boundary violations

## Production-Ready

This phase converts the hardened beta into a durable public product.

### 1. Real Payout Infrastructure

- [ ] Replace simulated escrow and claim flow with a real blockchain or custodial payout path.
- [ ] Add wallet signature flows and anti-fraud checks.
- [ ] Add transaction reconciliation, retries, and operator recovery tools.
- [ ] Add jurisdiction, tax, and compliance review for prize payouts.

Acceptance:

- real payouts can be initiated, tracked, and reconciled without manual spreadsheet intervention

### 2. Production Operations

- [ ] Stand up production environments with separation between dev, preview, staging, and prod.
- [ ] Add deployment automation, rollback strategy, and config management.
- [ ] Add on-call ownership, incident playbooks, and maintenance procedures.
- [ ] Add capacity planning for rooms, API, and LLM usage spikes.

Acceptance:

- production changes can be deployed, observed, and rolled back safely

### 3. Mature Product Surface

- [ ] Finish the public website with real company-facing and player-facing narratives.
- [ ] Add complete legal, privacy, FAQ, and support surfaces.
- [ ] Add robust profile, history, replay, and search experiences.
- [ ] Add seasonality or event structure if the leaderboard becomes persistent and public.

Acceptance:

- a new user can discover the product, understand the hidden-seat premise, play, get paid if applicable, and review their history without operator help

### 4. Advanced Moderation And Support

- [ ] Add operator admin panels for rooms, players, payouts, and experiment records.
- [ ] Add support workflows for disputes, payout issues, and moderation appeals.
- [ ] Add audit logs for moderation and operator actions.

Acceptance:

- the team can support a live product without direct database edits or ad hoc scripts

### 5. Research And Commercial Readiness

- [ ] Add company-facing benchmark exports and replay review workflows.
- [ ] Add experiment versioning and prompt-version comparison workflows.
- [ ] Add data contracts and documentation for research customers or partners.

Acceptance:

- the platform can support both player-facing usage and external benchmark/reporting use cases

## Cross-Stream Execution Order

Use this order to maximize parallelism without breaking contracts.

### Order 1: Confirm shared seams

- room transport and lifecycle
- public/private seat schema
- room completion event contract
- identity/session model
- asset manifest schema

### Order 2: Run in parallel

- Auction live room UX
- LLM runtime expansion
- leaderboard ingestion and UX
- payments ingestion and UX
- theme polish and credits generation
- analytics export scaffolding
- browser test scaffolding
- deployment configuration

### Order 3: Fan out to remaining games

- Split live integration
- Pact live integration
- Vault live integration
- Settlement live integration

### Order 4: Hardening and production

- persistence
- moderation
- observability
- security
- legal/compliance
- real payouts

## Suggested Worker Split

These streams can be assigned independently once the shared seams are stable.

- Core Runtime: `apps/rooms`, contracts, result emission, replay persistence
- Web Shell: onboarding, lobby, room shell, results, profile
- Auction: flagship live game and stage-demo polish
- Split: live integration plus game-specific result and replay view
- Pact: live integration plus game-specific result and replay view
- Vault: live integration plus game-specific result and replay view
- Settlement: live integration plus game-specific result and replay view
- LLM Runtime: provider adapters, prompt registry, timing normalization
- Leaderboard: ingestion, math, public boards, player rank views
- Payments: settlement ingestion, wallet UX, payout state machine
- Theme And Assets: visual polish, manifest, credits generation, asset imports
- QA: room tests, browser tests, regression suites, load tests
- Ops: deploys, secrets, observability, runbooks, incident handling
- Moderation And Trust: abuse controls, operator tools, legal/support workflows

## Relevant Operator Tooling

These globally installed Codex skills are relevant to the remaining work and can be referenced by workers when useful:

- `/Users/aant/.codex/skills/frontend-skill` for stronger web and game presentation work
- `/Users/aant/.codex/skills/develop-web-game` for iterative browser-based game work
- `/Users/aant/.codex/skills/playwright` for end-to-end multiplayer browser coverage
- one deployment skill after host choice is made, such as `/Users/aant/.codex/skills/vercel-deploy`, `/Users/aant/.codex/skills/render-deploy`, or `/Users/aant/.codex/skills/cloudflare-deploy`
- `/Users/aant/.codex/skills/security-threat-model` and `/Users/aant/.codex/skills/security-best-practices` once the platform is ready for formal security review
- `/Users/aant/.codex/skills/sentry` once production monitoring is in place

## Final Completion Gate

ARENA should not be considered complete until all of the following are true:

- at least one flagship game is fully live and stage-ready in mixed human/LLM multiplayer mode
- all shipped games run through the common room, replay, leaderboard, and payout pipelines
- no public API or UI leaks hidden seat backing type
- the visual presentation is cohesive and all third-party assets are credited correctly
- room, replay, leaderboard, payments, and analytics data persist across restarts
- browser, replay, and load tests are part of normal release gating
- deployment, moderation, observability, and operator runbooks exist and are actually usable
- if real payouts are enabled, the payout pipeline is compliant, auditable, and operationally owned
