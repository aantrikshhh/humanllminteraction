# Module Specs

This file consolidates completed planning streams so later coding agents can consume concrete scope without rereading the whole thread.

## Website

Owned surface:

- `/`
- `/games`
- `/how-it-works`
- `/for-companies`
- `/research`
- `/leaderboard` marketing shell only
- `/faq`
- `/credits`
- `/legal/privacy`
- `/legal/terms`

Rules:

- keep the public site mostly static
- explain the hidden human/LLM premise immediately
- use one flagship multiplayer demo above the fold
- consume tokens and manifest data from the theme package

Implementation note:

- use Next metadata, static-friendly marketing pages, `next/font`, and image optimization

## User Flow

Owned surface:

- `/app/onboarding`
- `/app/lobby`
- `/app/join/[code]`
- `/app/room/[roomId]`
- `/app/match/[sessionId]/results`
- `/app/profile/[playerId]`

Rules:

- client only sees `PublicSeatView`
- reconnect should be automatic first
- invite links beat manual codes
- one primary action per state

Required integrations:

- room create/join/reconnect/rematch
- wallet status and payout preview
- leaderboard delta and current rank

## Payments Stub

Recommended standards:

- EIP-1193 wallet provider interface
- EIP-6963 multi-wallet discovery
- ERC-4361 SIWE for wallet-bound sessions
- `wagmi + viem` on the client

Suggested ownership:

- `packages/payments-domain`
- `packages/payments-client`
- `apps/api/src/payments/*`
- `apps/web/components/payments/*`

Key state machines:

- escrow: `draft -> funding_required -> funding_authorized -> funded_simulated -> locked -> settlement_pending -> settled`
- payout: `pending_settlement -> available_to_claim -> claim_requested -> claimed_simulated`

Hard rule:

- label every payment state as simulated

## Leaderboard

Recommended model:

- public leaderboards list humans only
- mixed human/LLM rooms still affect human ratings
- keep private backing-type metadata out of public APIs

Recommended rating system:

- demo-friendly multiplayer Elo-like system
- base rating `1500`
- per-game and global ratings
- placement-percentile scoring
- higher `K` for first 10 rated matches
- damped global updates

Owned surface:

- `apps/api/src/leaderboard/*`
- `apps/web/app/leaderboard/*`
- `apps/web/app/profile/[playerId]/_components/leaderboard-*`
- leaderboard contracts and math package

## The Split

Game scope:

- 2-seat match
- 10 rounds
- alternating proposer/responder roles
- server-authoritative accept/reject resolution

Phases:

- `waiting_for_round_start`
- `proposer_turn`
- `responder_turn`
- `round_resolved`
- `inter_round_summary`

Key UI:

- offer slider or numeric stepper
- accept/reject controls
- role indicators
- history strip
- results summary with fairness metrics

Key telemetry:

- `round_started`
- `offer_submitted`
- `response_submitted`
- `round_resolved`

Visual note:

- mostly UI-driven
- tense negotiation chamber styling
- minimal bespoke scene art

## Pending streams

Still expected:

- Core Multiplayer + LLM Runtime
- Art Direction + Asset Governance
- QA/CI
- The Auction
- The Pact
- The Vault
- The Settlement
