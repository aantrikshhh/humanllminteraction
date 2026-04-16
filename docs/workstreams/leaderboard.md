# Leaderboard Workstream

## Owns

- `packages/leaderboard`
- leaderboard APIs in `apps/api`
- leaderboard and rank surfaces in `apps/web`

## Must Not Own

- room rules
- payment logic
- provider metadata

## Responsibilities

- define ranking models and ELO update boundaries
- implement per-game and global leaderboard views
- support player rank summaries and result deltas

## Research Focus

- ranking read-model design
- caching strategy
- filters for game type, timeframe, and player identity

## Interfaces Needed

- match results
- player profile data
- public game metadata

## Acceptance Criteria

- leaderboard can rank players across mixed human/LLM room outcomes
- UI exposes per-game and global views
- read APIs are decoupled from live room state

