# Plan: The Auction

## Scope

Own:

- `packages/games/auction`
- `apps/web/app/(app)/games/auction`

## Demo Objective

This is the flagship live demo because it is visibly multiplayer, high-energy, and easy to explain while preserving the hidden human-vs-LLM premise.

## Rules Plan

- 3 to 5 seats
- one live auction per round
- minimum raise increments
- players can bid or pass
- all bidders pay their final bid
- the last active bidder wins the prize

## Reducer Phases

- `auction_setup`
- `bidding_open`
- `pass_chain_check`
- `auction_resolved`
- `inter_auction_summary`
- `match_complete`

## UI Plan

- central prize display
- live bid rail
- per-seat status chips
- clear scoreboards before and after each auction
- spectator-first layout with current leader, last action, and tension timer

## Acceptance Criteria

- bidding order, pass handling, and resolution are deterministic
- partial human rooms can be backfilled by LLM seats without obvious UX differences
- the game is readable to spectators from one screen
