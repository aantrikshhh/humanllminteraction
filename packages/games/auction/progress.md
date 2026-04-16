Original prompt: redesign the Auction game module from a one-shot all-pay auction into a multi-round bankroll game while keeping the action surface practical for the existing room runtime.

- Reworked Auction into a three-round bankroll match.
- Each seat now carries a visible bankroll across rounds instead of resolving after one prize.
- Action surface stayed the same: `auction.bid` sets the seat's current-round total commitment and `auction.pass` exits only the current round.
- Round settlement is deterministic and typed:
  - one active seat remaining, or
  - round turn cap reached
- Final match scoring is now `total prize value won - total credits spent`.
- Added round history, per-seat bankroll/value/spend tracking, and replay events for `auction.round_settled` and `auction.round_started`.
- Updated the smoke coverage to exercise:
  - a full three-round bidding match
  - a pass-heavy match with zero-bid round wins
- Focused verification to run after implementation:
  - `npm run typecheck -w @arena/game-auction`
  - `npm test -w @arena/game-auction`
