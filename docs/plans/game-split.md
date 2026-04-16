# Plan: The Split

## Scope

Own:

- `packages/games/split`
- `apps/web/app/(app)/games/split`

## Rules Plan

- 2 seats
- 10 rounds
- alternating proposer/responder roles
- proposer submits an offer
- responder accepts or rejects
- round summary resolves score deltas before the next round

## Reducer Phases

- `round_setup`
- `proposer_turn`
- `responder_turn`
- `round_resolved`
- `match_complete`

## UI Plan

- offer slider or stepper
- accept/reject controls
- role badge
- score rail
- round history strip
- fairness summary at the end

## Acceptance Criteria

- role rotation is deterministic
- mixed human/LLM matches use the same protocol path as human-only matches
- replay output fully reconstructs the match
