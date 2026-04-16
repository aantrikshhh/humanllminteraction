# Payments Stub Plan

## Scope

Own:

- `packages/payments`
- `apps/api/src/payments`
- `apps/web/components/payments`

Do not own:

- real blockchain settlement
- match scoring
- generic profile routing

## Product Goal

Make rewards believable in the demo without moving real funds.

## Domain Model

- wallet connection state
- reward pool record
- escrow record
- payout record
- simulated transaction history

## State Machines

- escrow:
  - `draft`
  - `funding_required`
  - `funding_authorized`
  - `funded_simulated`
  - `locked`
  - `settlement_pending`
  - `settled`
- payout:
  - `pending_settlement`
  - `available_to_claim`
  - `claim_requested`
  - `claimed_simulated`

## Interfaces Needed

- `MatchResult`
- player identity shell
- results page and profile surfaces

## Acceptance Criteria

- users can connect a stub wallet and see balance, escrow, and payout history
- match completion can create believable payout records
- all payment states are clearly labeled simulated
