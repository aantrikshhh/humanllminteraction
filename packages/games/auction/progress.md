Original prompt: implement a concrete first pass of the Auction game module, not just a plan. Use the existing `@arena/contracts` and `@arena/game-sdk` shapes. Add meaningful types and a reducer-friendly game module for a 3-5 seat all-pay auction with visible current bid, pass behavior, and deterministic settlement. Include at least one simulation-oriented smoke test if you add tests. Keep the implementation modular and typed.

- Started the Auction slice implementation.
- Local `develop-web-game` skill is available and being followed for small-step validation.
- Added a deterministic smoke test that exercises a bidding race and the one-active settlement path.
- Verification passed:
  - `npm run typecheck -w @arena/game-auction`
  - `npm test -w @arena/game-auction`
- Remaining blocker: the shared room/runtime integration still needs to consume this module; the slice is self-contained but not yet wired into `apps/rooms`.
