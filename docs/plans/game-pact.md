# Plan: The Pact

## Scope

Own:

- `packages/games/pact`
- `apps/web/app/(app)/games/pact`

## Rules Plan

- 2 seats
- 15 rounds
- simultaneous `cooperate` or `betray` actions
- shared history visible before every decision
- scores update only after both choices are resolved

## Reducer Phases

- `round_setup`
- `choice_window`
- `round_reveal`
- `inter_round_summary`
- `match_complete`

## UI Plan

- dual-action control surface
- history timeline
- payoff preview
- score panel
- strategy summary after the match

## Acceptance Criteria

- simultaneous choices resolve authoritatively
- visible history matches replay history
- mixed human/LLM matches do not alter public flow
