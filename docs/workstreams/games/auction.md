# Game Workstream: The Auction

## Owns

- `packages/games/auction`
- `apps/web` route for the Auction game UI

## Responsibilities

- implement the first flagship live multiplayer demo
- support 3 to 5 seats, escalating bids, pass handling, and auction resolution
- expose escalation, walk-away, and sunk-cost metrics

## Design Focus

- obvious live multiplayer energy
- strong spectator readability
- visually attractive but mechanically lightweight MVP

## Interfaces Needed

- contracts and seat abstractions from core platform
- LLM move runtime
- theme primitives

## Acceptance Criteria

- bidding order, passing, and resolution are deterministic
- room can be demoed with partial human fill and LLM backfill
- replay and behavioral metrics are deterministic

