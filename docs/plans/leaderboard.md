# Leaderboard Plan

## Scope

- Deliver leaderboard standings as durable read models fed by completed match events, not by live room state.
- Support per-game standings for every `GameKey` plus a derived global standing that summarizes cross-game performance without exposing private seat metadata.
- Support the app-owned leaderboard route plus reusable summary slices for user-flow-owned results and profile shells.
- Preserve privacy invariants: mixed human/LLM rooms can affect rankings, but public leaderboard APIs and UI must not reveal backing type, model ids, or other server-only metadata.
- Keep MVP scope to current season and all-time views. Defer arbitrary rolling windows like `7d` or `30d` until there is a recomputation pipeline that can support them safely.

## Owned Paths

- `apps/api/src/leaderboard`
  - match-result ingestion
  - idempotent rating application
  - standings materialization
  - season/archive reads
  - leaderboard and player-summary endpoints
- `apps/web/app/(app)/leaderboard`
  - leaderboard page route
  - filter/search state
  - loading, empty, and error states
- `apps/web/components/leaderboard`
  - standings table
  - rank badges and trend chips
  - result-delta card
  - player summary slice for reuse by the User Flow stream

Path ownership intentionally follows `docs/coordination/WORKSTREAMS.md`. The existing `packages/leaderboard` package should be treated as a future extraction point for pure math/helpers, not as an owned implementation target for this planning stream unless ownership is clarified centrally.

## Dependencies

- `packages/contracts`
  - needs a stable leaderboard update input with `matchId`, `game`, `completedAt`, ranked eligibility, participant identity mapping, and explicit placement semantics
  - current `MatchResult` is not sufficient on its own for multiplayer standings because it lacks ordered placements, tie groups, and player identity joins
- Core Multiplayer + LLM Runtime
  - must emit one stable completion event per ranked match
  - must provide an idempotent event id or guarantee that `matchId` is unique and replay-safe
  - must expose enough private server-side data to join `seatId -> playerId/public identity` without leaking backing type to clients
- User Flow
  - owns results and profile routes, so this stream only supplies data contracts and reusable summary components
  - must define what a public player identity shell contains: `playerId`, display name, avatar, and profile slug if present
- API infrastructure
  - durable storage for player rating state, match-application ledger, snapshot archives, and recent-delta history
  - a simple admin/config surface for season rollovers and ranked/unranked environment flags
- QA + CI
  - deterministic fixtures for duplicate event delivery, mixed human/LLM outcomes, season resets, and tie-heavy free-for-all matches

## Ranking Model

### Public policy

- Public leaderboards should list persistent public player identities only.
- Mixed human/LLM room outcomes should still affect eligible human ratings.
- Synthetic seats should remain absent from public standings by default in MVP unless product explicitly adds public agent profiles later.
- Backing type, model id, prompt id, and timing metadata must stay server-side only.

### Canonical per-game rating

- Use a per-game Bayesian skill model with hidden `mu` and `sigma` and public `exposure = mu - 3*sigma`.
- Sort public per-game standings by `exposure`, not by raw `mu`, because the conservative lower bound is more stable for players with different match counts.
- Track per player and per game:
  - `mu`
  - `sigma`
  - `exposure`
  - `matchesPlayed`
  - `wins`
  - `podiums`
  - `averagePlacement`
  - `lastMatchAt`
  - `provisional`
  - `seasonId`

This is a better fit than Elo for ARENA because official Microsoft Research documentation describes TrueSkill as a generalization of Elo that tracks uncertainty, models draws, and handles any number of competing entities and team results, and its own leaderboard guidance recommends ranking by conservative estimate `mu - k*sigma` with `k=3`. Sources: [TrueSkill project](https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/), [TrueSkill paper](https://www.microsoft.com/en-us/research/publication/trueskilltm-a-bayesian-skill-rating-system/).

### Match input used for rating

- MVP rating updates should use final placement only, not raw score margin.
- Every ranked result must resolve to an ordered placement list with explicit tie groups.
- `seatScores` should still be persisted for match summaries, replay views, and future ranking research, but they should not change public rating in v1.

This keeps the first implementation aligned with the original TrueSkill model, which updates from relative ranking only. Microsoft Research also documents separate score-based extensions, which are useful but materially more complex and should stay post-MVP. Sources: [TrueSkill project](https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/), [Score-based Bayesian Skill Learning](https://www.microsoft.com/en-us/research/publication/score-based-bayesian-skill-learning-2/), [TrueSkill 2](https://www.microsoft.com/en-us/research/publication/trueskill-2-improved-bayesian-skill-rating-system/).

### Global standing

- Do not maintain a second raw cross-game MMR that mixes all game modes together.
- Instead, derive `global` from normalized per-game standing contribution after each per-game update.
- Recommended formula for MVP:
  - include a game only after the player has at least `5` rated matches in that game
  - require at least `2` eligible games before a player appears on the global board
  - compute `globalScore` as the weighted mean of each eligible game's percentile standing, scaled to `0-1000`
  - cap per-game weight so one mode cannot dominate the global view purely by volume

This avoids pretending that raw skill numbers from very different games are directly comparable while still supporting the repo's required `global` leaderboard surface.

### Provisional and ranked eligibility rules

- Mark a player provisional for a game until they reach the minimum rated-match threshold and/or `sigma` drops below a configured certainty threshold.
- Keep a `hide provisional` default filter on public top standings.
- Only matches explicitly flagged `ranked` should update public boards.
- Private tests, CI simulations, moderation replays, and scripted experiments must be excluded at ingest time.

### Standing order and tie behavior

- Primary order:
  - `publicScore desc`
- Per-game `publicScore`:
  - `exposure`
- Global `publicScore`:
  - `globalScore`
- Deterministic tie-break chain:
  - `mu desc` for per-game boards
  - `sigma asc`
  - `wins desc`
  - `matchesPlayed desc`
  - `lastMatchAt desc`
  - `playerId asc`
- Display shared ranks when `publicScore` ties exactly, but keep a unique cursor/order key for pagination and stable rerenders.

The important design choice is not the exact sports criteria but the principle: tie handling must be deterministic, multi-step, and repeatable. Official NBA standings are a useful reference for reapplying a fixed tie-break chain until ties are fully or partially resolved. Source: [NBA standings tie-break rules](https://www.nba.com/standings?Section=ab).

### Seasons and archives

- Keep one live season and immutable archived seasons.
- On reset, archive the prior live standings as read-only and start a fresh live season instead of mutating history in place.
- Player profile summaries should be able to query both current-season and historical best finish.

This matches the standard archive/version pattern used by production leaderboard services. Source: [Unity leaderboard archives and versions](https://docs.unity.com/en-us/leaderboards/concepts/archives).

## Implementation Plan

1. Freeze the ingest contract before any UI work.
   - Introduce a dedicated `LeaderboardUpdateEvent` or expand `MatchResult` so the leaderboard service receives:
     - `matchId`
     - `eventId`
     - `game`
     - `completedAt`
     - `seasonId` or ranked-environment key
     - ordered placements with tie groups
     - participant records that can be joined to persistent public identities
     - `ranked` boolean
   - If shared contracts cannot change immediately, implement a server-side enrichment step in `apps/api/src/leaderboard` that joins `MatchResult` with room/session metadata before rating application.

2. Build the write-side leaderboard service in `apps/api/src/leaderboard`.
   - Create a pure rating engine module for:
     - per-game rating updates
     - exposure calculation
     - provisional-state evaluation
     - derived global score recomputation
   - Create persistence models for:
     - player-game rating state
     - global summary state
     - match-application ledger keyed by `matchId` or `eventId`
     - season metadata
     - archived leaderboard snapshots
     - recent rating delta history

3. Make ingestion idempotent and replay-safe.
   - Applying the same match twice must be a no-op.
   - Rebuilding a season from the event log must produce the same standings as incremental ingest.
   - A backfill command should be able to rebuild standings after contract changes or season resets.

4. Materialize read models for fast queries.
   - Precompute top standings per `(seasonId, scope)` where `scope` is `global` or a specific `GameKey`.
   - Materialize player summary rows separately so profile/results surfaces do not need to scan full standings.
   - Keep recent movers and last-match deltas as separate small read models rather than recomputing them from the full event stream on page load.

5. Expose stable API reads.
   - `GET /leaderboard?scope=global|game&game=<key>&season=<id>&cursor=<cursor>`
   - `GET /leaderboard/players/<playerId>/summary`
   - `GET /leaderboard/players/<playerId>/history?scope=global|game&game=<key>`
   - `GET /leaderboard/seasons`
   - Responses should include pagination cursors, provisional flags, and enough metadata for the web app to render filters without additional joins.

6. Build the leaderboard route in `apps/web/app/(app)/leaderboard`.
   - Tabs or segmented controls for `Overall` plus each game.
   - Filters for season, player search, and provisional visibility.
   - Standings row design should emphasize:
     - rank
     - player identity
     - public score
     - trend/delta
     - matches played
     - wins or podium rate
     - last active
   - Empty states should explain provisional or insufficient cross-game participation clearly.

7. Ship reusable components for other streams.
   - `LeaderboardSummaryCard` for profile shells
   - `ResultRankDeltaCard` for post-match results
   - `LeaderboardTable` and `LeaderboardFilters` for the main standings page
   - Keep these in `apps/web/components/leaderboard` so User Flow can consume them without giving up route ownership

8. Add operational behavior for season rollover.
   - Manual season reset is enough for MVP.
   - Reset must archive the old live standings, create a new live season id, and preserve player history references.
   - Do not delete prior season data during reset.

## Acceptance Criteria

- Ranked match completion updates per-game standings deterministically for two-player and free-for-all games.
- Re-ingesting the same completion event does not apply rating changes twice.
- Public leaderboard APIs never expose `backingType`, model ids, prompt ids, or other private seat metadata.
- Mixed human/LLM ranked matches can change eligible human standings without revealing which opponents were synthetic.
- The app route supports:
  - global and per-game views
  - current season and archived season reads
  - player search
  - provisional filtering
- User Flow can consume leaderboard-owned summary components or data contracts for:
  - post-match rank delta
  - current player rank
  - profile leaderboard summary
- Global standing is derived from normalized per-game results, not by directly mixing raw per-game rating numbers.
- Season reset preserves a queryable read-only archive of the previous live standings.

## Risks

- Contract gap between room results and leaderboard needs
  - `MatchResult` currently lacks placements, tie groups, ranked eligibility, and direct player identity mapping. Without one of those paths, multiplayer ratings will be ambiguous or wrong.
- Ownership mismatch around `packages/leaderboard`
  - The repo already contains a shared leaderboard package, but the coordination docs assign ownership only to `apps/api` and `apps/web`. Clarify whether math/helpers may move there before implementation starts.
- Cross-game global ranking can become misleading
  - If the team falls back to a single raw global MMR, the board will overstate comparability across very different game modes and can be gamed by farming one mode.
- Identity leakage through leaderboard policy
  - If synthetic seats are shown publicly without a product decision, the leaderboard becomes a post-hoc backing-type reveal surface.
- Duplicate or out-of-order event delivery
  - Without an application ledger and replay-safe ingest, standings will drift under retries, backfills, or rematch bursts.
- Low-population seasons
  - Small player counts can make percentile-derived global scores unstable early in a season. Mitigate with provisional gating, minimum-match thresholds, and clear UI labeling.
