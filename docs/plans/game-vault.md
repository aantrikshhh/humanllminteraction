# Plan: The Vault

## Scope

Own:

- `packages/games/vault`
- `apps/web/app/(app)/games/vault`

## Rules Plan

- 4 to 6 seats
- one contribution phase and one accusation phase per round
- contributions remain private until reveal
- pooled value is multiplied and redistributed
- accusation outcomes create bonus and penalty deltas

## Reducer Phases

- `round_setup`
- `contribution_window`
- `pool_reveal`
- `accusation_window`
- `accusation_reveal`
- `round_resolved`
- `match_complete`

## UI Plan

- private contribution control
- pool summary card
- accusation ballot
- round scoreboard
- end-of-match contribution and detection summary

## Acceptance Criteria

- phase transitions are deterministic
- votes and scores resolve authoritatively
- replay captures both private contributions and public reveals correctly
