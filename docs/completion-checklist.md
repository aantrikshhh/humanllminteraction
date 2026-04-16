# ARENA Execution Roadmap

This document is the execution roadmap for taking the current repo from scaffolded demo slices to a finished ARENA product. It is written to maximize parallelism without creating merge debt or contract breakage.

## Product End State

ARENA is complete only when all of the following are true:

- live multiplayer rooms work end to end for mixed human and hidden-LLM seats
- the product never leaks which seats are human vs LLM in any public UI, payload, or replay
- at least one flagship game is stage-demo ready and the rest of the shipped games run through the same room, results, leaderboard, and payout pipelines
- room state, replay logs, leaderboard state, payouts, and experiment data persist across restarts
- the web experience looks deliberate and cohesive, and all third-party assets are credited correctly
- deployment, moderation, observability, and operator workflows are real enough to run the product without hand-editing state

## Current Baseline

The repository already contains:

- a monorepo with `apps/web`, `apps/api`, `apps/rooms`, shared packages, and five game packages
- an in-memory authoritative room runtime with registered modules for `auction`, `split`, `pact`, `vault`, and `settlement`
- a web shell with marketing, lobby, leaderboard, and payments surfaces
- an operator-oriented Auction flow from the web app into the room runtime
- in-memory leaderboard and payments engines exposed through `apps/api`
- deterministic game slices and smoke-test coverage for the initial packages
- asset policy and third-party attribution scaffolds

The missing work is what turns this into a complete product: durable multiplayer runtime, fully usable room flows, hidden-seat LLM runtime, persistence, analytics, moderation, deployment, reliability, and production payout ownership.

## How To Execute This Roadmap

- Use `Demo Milestone` as the shortest path to a convincing live product.
- Use `Beta Milestone` as the threshold for external testing and research usage.
- Use `Production Hardening` as the threshold for a durable public product.
- Do not fan out dependent work until the blocking contracts are frozen.
- Give each worker a narrow write scope and require it to research and plan before implementation.
- Keep shared seams under one owner at a time. Parallelism should happen around seams, not across them.

## Program Rules

### Shared contract rules

These contracts must be explicitly frozen before dependent streams fan out:

- room transport and room lifecycle
- public seat schema vs private seat schema vs experiment-private schema
- room completion payload and replay reference contract
- identity and session model
- asset manifest and credits generation format

Acceptance:

- each contract is represented in code and documented clearly enough that downstream teams do not need to infer behavior from implementation details

### Worker rules

- One worker owns one write surface at a time.
- Shared infra work stays on the main thread until its contract is stable.
- Every worker should start by producing a short implementation plan and research notes before patching code.
- Every worker should know the globally installed curated skills are available in `/Users/aant/.codex/skills`.
- Prefer `gpt-5.4` with `high` reasoning for routine scoped work and `xhigh` reasoning for shared contracts, architecture, or risky migrations.
- Workers should cite which skills they are using when a skill materially affects the implementation.

### Asset rules

- The visual base remains Kenney-first.
- Approved supplements are `0x72 DungeonTileset II`, `0x72 DungeonUI`, `ansimuz top-down collection`, and selected `OpenGameArt` assets.
- Credit all supplemental sources whenever used.
- OpenGameArt assets must be tracked per asset, not per site, because licenses vary.
- Do not mix packs on the same gameplay screen until tile size, palette, and outline weight are normalized.

## Critical Path

The path below is the true schedule driver. Most other work can run around it.

1. Freeze room transport, lifecycle, and reconnect semantics.
2. Freeze hidden-seat data boundaries and room completion payload.
3. Implement durable room persistence and replay storage.
4. Finish the common live room shell in the web app.
5. Finish the flagship Auction vertical slice end to end.
6. Wire automatic propagation into leaderboard, payments, and match history.
7. Add multiplayer browser coverage and leak-prevention tests.
8. Ship a repeatable demo runbook and deployable demo environment.

If this path slips, the whole schedule slips. Treat these items as the highest priority over polishing secondary pages or bringing additional games live.

## Shared Blockers

The following are hard blockers. Do not spawn dependent work until they are green.

### Blocker 1: Transport and room lifecycle freeze

Decision required:

- choose the live transport shape for `apps/rooms`
- define room lifecycle transitions for create, join, ready, active, result, rematch, spectator sync, reconnect, and close

Blocks:

- live room pages
- reconnect and spectator work
- multiplayer E2E coverage
- deployment topology

Acceptance:

- two browsers can join the same room, stay in sync, recover from refresh, and finish a match using one documented transport path

### Blocker 2: Hidden-seat data boundary freeze

Decision required:

- define `public seat`, `seat-private`, and `experiment-private` data exactly

Blocks:

- room shell
- results pages
- leaderboard privacy rules
- analytics exports

Acceptance:

- no public API or page needs access to backing-type or provider metadata

### Blocker 3: Match completion contract freeze

Decision required:

- define the canonical room-complete payload, replay pointer, seat-to-player mapping, and settlement trigger contract

Blocks:

- automatic leaderboard updates
- payout generation
- match history
- replay retrieval
- analytics ingestion

Acceptance:

- a completed room emits one stable match-complete event that downstream services can consume without reading runtime internals

### Blocker 4: Identity and session freeze

Decision required:

- define how anonymous demo sessions, invite links, durable players, and wallet-linked players coexist

Blocks:

- onboarding
- profile history
- attribution on leaderboard and payouts
- moderation

Acceptance:

- the same identity rules govern room joins, match history, payouts, and player profile ownership

### Blocker 5: Asset manifest freeze

Decision required:

- define the manifest schema used to track imported assets, licensing, authorship, and attribution output

Blocks:

- credits generation
- CI asset validation
- multi-pack art ingestion

Acceptance:

- every third-party asset can be represented and rendered into both repo documentation and in-app credits without ad hoc fields

## Workstreams

Each workstream below is modular. Once its dependencies are green, it can be owned independently.

### 1. Core Runtime

Scope:

- `apps/rooms`
- shared room contracts
- replay persistence
- room completion event emission

Dependencies:

- none for the initial contract work
- after freeze, depends only on persistence and infra choices

Required actions:

- finalize transport and lifecycle
- implement reconnect, disconnect, rematch, and spectator sync
- add durable storage for rooms, replays, and result payloads
- add seat reservation, partial fill, and hidden LLM backfill
- guarantee one replay-safe event stream per room

Acceptance:

- any supported game can run inside one authoritative room model with persistence, reconnect support, and deterministic replay

### 2. LLM Runtime

Scope:

- `packages/agents`
- any API worker or service used to drive LLM seats

Dependencies:

- hidden-seat contract freeze
- room action contract per game

Required actions:

- replace fake-only adapters with provider-backed adapters plus deterministic fake adapters for CI
- add prompt version registry, model registry, timeout handling, retries, and cost controls
- normalize seat timing and ready states to avoid identity leaks
- store experiment-private metadata separately from public room state

Acceptance:

- a room can run with human, fake-LLM, or real-LLM seats without changing client behavior or leaking seat type

### 3. Web Shell

Scope:

- shared app shell
- onboarding
- lobby
- live room shell
- results
- profile

Dependencies:

- room lifecycle freeze
- hidden-seat contract freeze
- identity/session freeze

Required actions:

- finish anonymous join, invite join, and re-entry flows
- finish the canonical live room shell used by all games
- finish post-match results, replay entry, and next-action flows
- add player profile pages with match history and ranking summary

Acceptance:

- a new user can join a room, play, see results, inspect replay/history, and navigate onward without operator help

### 4. Flagship Game: Auction

Scope:

- `packages/games/auction`
- Auction-specific routes and presentation

Dependencies:

- core runtime
- live room shell
- LLM seat runtime

Required actions:

- complete Auction live flow with ready-up, action loop, timer handling, results, and rematch
- add spectator-readable UI and game-specific results
- add demo templates and operator controls for mixed-seat rooms
- polish presentation so it reads as a real product, not a debug tool

Acceptance:

- Auction is stage-demo ready in mixed human/hidden-LLM multiplayer mode and can be run repeatedly from a scriptable operator flow

### 5. Secondary Games

Scope:

- `split`
- `pact`
- `vault`
- `settlement lite`

Dependencies:

- stable live room shell
- stable room runtime
- stable result propagation contract

Required actions:

- integrate each game end to end into the live room pipeline
- add game-specific action surfaces, result pages, and replay rendering
- rebalance based on actual play logs

Acceptance:

- each shipped game can be launched from the lobby, supports hidden-seat multiplayer, persists replays/results, and updates downstream systems correctly

### 6. Leaderboard

Scope:

- leaderboard ingest
- ranking logic
- public and player-specific views

Dependencies:

- match completion contract
- identity rules

Required actions:

- consume room-complete events automatically
- finalize ranking logic and per-game/global board logic
- enforce human-only public boards while still incorporating mixed-seat match outcomes
- build usable player drill-down and rank-change views

Acceptance:

- a finished match updates the correct human players automatically and the public board never leaks hidden seat identities

### 7. Payments

Scope:

- payout stub runtime
- wallet flow
- payout policy and settlement logic

Dependencies:

- match completion contract
- identity rules

Required actions:

- consume room-complete events automatically
- finish the simulated wallet, escrow, claim, and history UX
- define the MVP payout policy for stake, win conditions, ties, and abandonment
- add repair or replay-safe settlement logic for incomplete rooms

Acceptance:

- a qualifying match creates one correct payout record per player without manual intervention and the user can inspect the full simulated payout flow in the app

### 8. Theme, Assets, And Credits

Scope:

- shared theme
- visual tokens
- asset ingestion
- credits output

Dependencies:

- asset manifest freeze

Required actions:

- unify marketing, lobby, live room shell, and flagship game under one house style
- import supplemental packs only where necessary
- create manifest validation and generated credits surfaces
- document per-asset attribution for OpenGameArt imports

Acceptance:

- the product looks like one system and every imported third-party asset is correctly represented in repo and in-app credits

### 9. Analytics And Research

Scope:

- replay retrieval
- match history
- experiment logging
- operator export surfaces

Dependencies:

- match completion contract
- hidden-seat contract
- persistence

Required actions:

- store and retrieve public replays durably
- store private experiment metadata durably
- expose operator search for recent matches and experiments
- support export for benchmark analysis and partner reporting

Acceptance:

- one completed mixed-seat match produces a replay, a public result record, and an experiment record usable for later evaluation

### 10. QA And Reliability

Scope:

- automated tests
- CI gates
- load testing
- diagnostics

Dependencies:

- stable transport
- stable room shell
- stable flagship game

Required actions:

- make `typecheck`, `test`, and `build` blocking in CI
- add multi-client browser tests for the flagship game
- add hidden-seat leak tests across API and UI
- add replay determinism tests and room load tests
- add structured logging, health surfaces, and basic alerts

Acceptance:

- regressions in room sync, seat privacy, or match completion are caught before release and operational failures can be diagnosed from logs and dashboards

### 11. Deployments And Operations

Scope:

- environment topology
- secrets
- deploy automation
- runbooks

Dependencies:

- transport decision
- persistence choice

Required actions:

- choose the first real host topology for `web`, `api`, and `rooms`
- define environment variables and secret handling
- add preview and production-like demo deploys
- write demo, incident, rollback, and restore runbooks

Acceptance:

- the team can deploy, recover, and operate the stack without local-only assumptions

### 12. Trust, Moderation, Security, And Legal

Scope:

- abuse controls
- authz
- audit trails
- legal and compliance surfaces

Dependencies:

- identity rules
- data boundary rules
- payout policy

Required actions:

- add player reporting and operator moderation surfaces
- add rate limiting and abuse controls on room and API entry points
- threat-model multiplayer, payout, and LLM surfaces
- finalize privacy, data use, and payout disclosures to match actual implementation

Acceptance:

- the platform has a documented minimum security posture and can handle basic abuse, disputes, and data-boundary reviews without ad hoc intervention

## Demo Milestone

This is the first milestone that should be considered externally presentable.

### Goal

Run one repeatable mixed-seat multiplayer demo that proves the hidden human-vs-LLM premise.

### Scope

- live multiplayer transport
- hidden-seat runtime
- Auction as the flagship game
- canonical room shell
- results page
- automatic leaderboard update
- automatic payout stub update
- durable replay and match result persistence
- cohesive visual pass on the web shell and Auction
- demo deployment and runbook

### Exit criteria

- two browsers can join the same Auction room and complete a match
- hidden LLM seats can backfill the room without leaking identity
- the room survives refresh and emits one durable replay and one durable result package
- the result automatically updates leaderboard and payout stub surfaces
- the UI looks intentional enough for a live demo
- operators can run the demo from a checklist without reading code

### Explicit non-goals

- real payouts
- all games live
- full moderation system
- comprehensive external account system

## Beta Milestone

This is the threshold for external testers, research sessions, and repeated partner-facing use.

### Goal

Make the product stable enough for repeated usage without operator babysitting.

### Scope

- all intended MVP games live through the common room shell
- real identity and session model
- persistent stores for leaderboard, payouts, matches, replays, and experiment records
- better moderation and abuse controls
- observability, alerts, backups, and repair tools
- operator search and analytics exports

### Exit criteria

- every shipped game can be launched from the lobby and completed end to end
- match data, payouts, rankings, and replays survive service restarts
- a returning player can recover identity, history, and ranking
- operators can inspect incidents, find matches, repair failed settlements, and moderate users without database edits
- the system can tolerate repeated internal and external play sessions without constant manual intervention

## Production Hardening Milestone

This is the threshold for a durable public product.

### Goal

Turn the hardened beta into an operationally owned product with real payout capability and minimum production governance.

### Scope

- real payout infrastructure or a fully compliant custodial equivalent
- production environments and rollback paths
- operator admin panels and audit logs
- support workflows, legal surfaces, and compliance posture
- capacity planning and on-call readiness

### Exit criteria

- production deploys, rollbacks, and incident response work from runbooks
- moderation, support, and payout operations do not require direct database editing
- real payouts, if enabled, are auditable, reconcilable, and compliance-reviewed
- the platform can support both player-facing usage and research/benchmark reporting

## Parallelization Plan

Use this sequence to maximize safe throughput.

### Phase 0: Contract freeze

Run on the main thread only:

- transport and lifecycle freeze
- hidden-seat boundary freeze
- match completion contract freeze
- identity/session freeze
- asset manifest freeze

Output:

- documented contracts
- code-level schema or interface updates
- explicit go/no-go for downstream workers

### Phase 1: Parallel vertical foundations

Safe to run in parallel once Phase 0 is green:

- LLM runtime
- web shell
- leaderboard ingestion
- payments ingestion
- theme and asset pipeline
- deployment setup
- analytics scaffolding
- QA scaffolding

Output:

- each stream owns one modular surface and integrates against frozen contracts only

### Phase 2: Flagship vertical

Run with highest priority:

- Auction live room completion
- demo script
- demo polish
- multi-client browser coverage

Output:

- one end-to-end stage-demo-ready game

### Phase 3: Fan out additional games

Once the flagship vertical is stable:

- Split live integration
- Pact live integration
- Vault live integration
- Settlement Lite live integration

Output:

- the rest of the content pack rides the already-stable room shell and downstream pipelines

### Phase 4: Hardening

Run after the core product loop is stable:

- persistence maturity
- moderation
- observability
- security review
- legal and support surfaces
- load testing and backup drills

## Suggested Worker Split

Assign workers only after confirming the dependencies for that stream are green.

- Main thread: shared contracts, room transport, room lifecycle, match completion contract, identity rules, asset manifest schema
- Core Runtime worker: room persistence, reconnect, spectator sync, rematch, replay durability
- LLM Runtime worker: provider adapters, prompt registry, timing normalization, experiment logging
- Web Shell worker: onboarding, lobby, room shell, results, profile
- Auction worker: flagship gameplay, visuals, result view, demo controls
- Split worker: live integration plus result and replay views
- Pact worker: live integration plus result and replay views
- Vault worker: live integration plus result and replay views
- Settlement worker: live integration plus result and replay views
- Leaderboard worker: ingest, ranking logic, boards, player drill-down
- Payments worker: payout ingest, wallet flow, settlement policy, payout history
- Theme and Assets worker: design tokens, art ingestion, credits generation, attribution ledger
- QA worker: Playwright, room tests, replay tests, leak tests, load tests
- Ops worker: deploys, secrets, health checks, alerts, runbooks
- Trust and Moderation worker: abuse controls, reporting, admin surfaces, legal and support workflows

## Acceptance Gates By Layer

### Contract gate

- schemas are explicit
- no downstream surface depends on hidden internals
- replay and result payloads are stable

### Product loop gate

- create room
- join room
- play match
- finish match
- see results
- update leaderboard
- update payout stub
- retrieve replay

### Privacy gate

- no public payload or page leaks hidden-seat truth
- no replay leaks provider or prompt metadata
- public leaderboards show humans only

### Visual gate

- shared theme spans marketing, lobby, room shell, and flagship game
- all imported assets are normalized and credited

### Reliability gate

- restart-safe persistence exists for core data
- browser tests cover the flagship multiplayer loop
- logs and health checks exist for room and payout failures

## Explicit Blockers To Final Completion

The project is not complete if any of these remain open:

- room transport is still effectively demo-only
- match state or results still rely on in-memory state that is lost on restart
- hidden-seat truth can be inferred from payloads, timing, or UI tells
- leaderboard or payout updates still require manual intervention
- the flagship demo still depends on an operator reading source code to recover from common failures
- third-party asset attribution is incomplete or unverifiable
- there is no usable incident, deploy, or restore path

## Operator-Useful Skills

These globally installed skills are directly relevant to the remaining work:

- `/Users/aant/.codex/skills/frontend-skill`
- `/Users/aant/.codex/skills/develop-web-game`
- `/Users/aant/.codex/skills/playwright`
- `/Users/aant/.codex/skills/vercel-deploy`
- `/Users/aant/.codex/skills/render-deploy`
- `/Users/aant/.codex/skills/cloudflare-deploy`
- `/Users/aant/.codex/skills/security-threat-model`
- `/Users/aant/.codex/skills/security-best-practices`
- `/Users/aant/.codex/skills/sentry`

Use one deployment skill only after the hosting choice is made. Use the security skills once the product loop is stable enough for a real threat-model and posture review.

## Final Readiness Checklist

- [ ] contracts are frozen and represented in code
- [ ] flagship Auction demo is live, durable, visually polished, and repeatable
- [ ] hidden-seat privacy holds across UI, APIs, replays, and leaderboards
- [ ] leaderboard, payouts, and match history update automatically from room completion
- [ ] all shipped games run through the common room and replay pipeline
- [ ] persistence exists for players, matches, replays, payouts, rankings, and experiments
- [ ] asset credits are generated correctly for all imported third-party content
- [ ] browser, replay, and load tests are part of release gating
- [ ] deploy, incident, restore, and moderation runbooks exist and are usable
- [ ] if real payouts are enabled, the payout path is auditable, reconcilable, and compliance-reviewed
