# Payments Stub Workstream

## Owns

- `packages/payments`
- payout and escrow stub endpoints in `apps/api`

## Must Not Own

- actual production blockchain deployment
- game scoring logic

## Responsibilities

- design wallet connect stub
- implement fake escrow lifecycle for company-funded matches
- implement payout history records
- provide a future-safe boundary for real chain integration later

## Research Focus

- wallet UX for demo environments
- fake balance and payout flows
- escrow status modeling

## Interfaces Needed

- match result schema
- player identity/profile schema

## Acceptance Criteria

- users can connect a stub wallet and view balances and payout history
- match completions can generate payout stub records
- API boundary is swappable for later on-chain integration

