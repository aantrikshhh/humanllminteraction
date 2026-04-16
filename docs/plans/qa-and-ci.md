# QA and CI Plan

## Scope

- Define the automated quality gates for the ARENA monorepo across static checks, room logic, deterministic replay, mixed-seat simulations, and browser E2E.
- Own the cross-workstream test harnesses under `tests/**` and the workspace-level CI wiring that executes them.
- Cover the non-negotiable product constraints from the shared context: human vs human, human vs LLM, LLM vs LLM, reconnect/rematch behavior, and deterministic replay verification.
- Prioritize the flagship demo path for `The Auction` so pull requests always exercise one believable end-to-end multiplayer slice.
- Exclude product behavior ownership. QA/CI verifies room and game behavior through fixtures and harnesses, but game rules, UX decisions, and domain implementations stay with their owning streams.

## Owned Paths

- `tests/room/**`
- `tests/simulations/**`
- `tests/e2e/**`
- `.github/workflows/**`
- Root workspace CI and test config needed to execute the owned suites:
  - `package.json`
  - `package-lock.json`
  - `turbo.json`
  - root test config files such as `vitest.config.*`, `playwright.config.*`, and shared test `tsconfig` files
- Generated artifacts and reports produced by CI, but not committed:
  - `coverage/**`
  - `playwright-report/**`
  - `test-results/**`

## Dependencies

- Core multiplayer runtime must freeze `Seat`, `PublicSeatView`, `PrivateSeatMetadata`, room message envelopes, replay events, and match results before the room and simulation suites can become stable.
- Game packages must expose deterministic reducers and result finalization for `split`, `pact`, `vault`, `auction`, and `settlement`, plus seedable fixtures for valid actions and terminal states.
- `apps/web`, `apps/rooms`, and `apps/api` must publish stable local startup commands so E2E can boot the full stack in CI without bespoke shell glue.
- User flow and game UI streams must add stable test selectors for join, ready, action, reconnect, results, and rematch flows. E2E should not depend on brittle text-only selectors for core controls.
- Agents must provide an offline scripted adapter for CI. Required CI must not call live model APIs.
- Payments and leaderboard streams must expose deterministic seed/reset hooks or in-memory fixtures once their browser-visible surfaces are added to the happy path.
- The current repo baseline must be normalized first:
  - `npm test`, `npm run lint`, and `npm run typecheck` currently succeed without running any real workspace scripts.
  - `package.json` omits `tests/*` from `workspaces`, while `package-lock.json` still lists `tests/*`.
  - `tests/e2e`, `tests/room`, and `tests/simulations` are directories with `README.md` files only, so they are not executable test packages yet.

## Test Strategy

- Make `tests/room`, `tests/simulations`, and `tests/e2e` first-class npm workspaces with their own `package.json` files and scripts. This matches npm workspace behavior, where `npm run ... --workspaces` only targets workspaces declared in the root `package.json`: https://docs.npmjs.com/cli/v8/using-npm/workspaces/
- Keep the suites as separate workspaces instead of one root Vitest project. Turborepo’s Vitest guidance notes that package-boundary test commands keep caching effective in CI, while root-level Vitest projects trade that away: https://turborepo.dev/docs/guides/tools/vitest
- Use `Vitest` for `tests/room` and `tests/simulations`. It fits the repo’s TypeScript and ESM setup, supports separate config per suite, and keeps room/simulation tests fast and local: https://vitest.dev/config/
- Use `Playwright` for `tests/e2e`. On required CI, run Linux plus Chromium only, enable retries in CI, collect traces on first retry, and upload artifacts for failed runs. This follows Playwright’s CI guidance: https://playwright.dev/docs/best-practices
- Add a dedicated `tsconfig.json` for the Playwright workspace and run `tsc --noEmit` alongside Playwright, because Playwright will execute TypeScript tests without treating non-critical type errors as test failures: https://playwright.dev/docs/next/test-typescript
- Keep one always-on required GitHub Actions workflow for PRs. Do not rely on workflow-level `paths` filters for required checks, because GitHub leaves skipped required workflows in `Pending`; narrow execution inside jobs with suite-specific commands instead: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Use `actions/setup-node` plus `npm ci` in CI, with npm dependency caching enabled through the action, and upload Playwright reports and traces as workflow artifacts: https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs and https://docs.github.com/en/actions/tutorials/store-and-share-data

- Room test coverage in `tests/room` should verify:
  - public seat payloads never expose backing type or other private metadata
  - room phase transitions across lobby, ready, active, results, and closed
  - invalid or out-of-turn actions are rejected deterministically
  - reconnect and rematch flows preserve public/private state boundaries correctly
  - replay events are ordered, complete, and stable for a given seed plus action sequence

- Simulation coverage in `tests/simulations` should verify:
  - mandatory modes: human vs human, human vs LLM, and LLM vs LLM
  - per-game deterministic replay and match-result consistency
  - timing normalization behavior through scripted agent adapters and fake clocks
  - seed-based scenario corpora for `auction` first, then `split`, `pact`, `vault`, and `settlement`
  - a small PR-safe corpus and a larger nightly/manual corpus

- Browser E2E coverage in `tests/e2e` should verify:
  - flagship `The Auction` happy path from lobby to room join, ready-up, active play, results, and rematch
  - reconnect recovery for a player re-entering an active room
  - mixed-seat presentation that never exposes which seats are human or synthetic
  - later smoke coverage for leaderboard and payments surfaces once those streams expose stable routes

- Smoke and load strategy:
  - PR CI runs a minimal smoke path only: one flagship browser flow, one room suite, and one simulation slice
  - nightly or manual CI runs larger simulation batches and room load scenarios using scripted clients
  - live-model, cross-browser, and long-running load tests remain out of the required PR gate until the runtime and UI stabilize

- Coverage policy:
  - Phase 1 collects coverage reports but does not block on blanket percentage targets
  - Phase 2 adds thresholds only after the room protocol and flagship game reducers stop changing shape
  - Hard behavioral gates matter more than early percentage vanity metrics in this repo

## Implementation Plan

1. Normalize workspace execution.
   - Restore `tests/*` in the root `workspaces` list.
   - Create `package.json` files for `tests/room`, `tests/simulations`, and `tests/e2e`.
   - Replace the current root no-op commands with explicit CI-friendly scripts such as `test`, `test:room`, `test:simulations`, `test:e2e`, and `test:smoke`.

2. Establish shared QA infrastructure inside `tests/**`.
   - Add shared seeded fixture builders, fake clocks, scripted agent doubles, and replay comparators.
   - Add separate `tsconfig` files for Vitest suites and the Playwright suite.
   - Define a common test data reset pattern for services that need clean state between runs.

3. Build `tests/room`.
   - Start with contract-level privacy, room lifecycle, reconnect, rematch, and replay determinism tests against the core runtime.
   - Make `auction` the first fully covered game flow because it is the demo-critical vertical slice.
   - Expand the same harness to the other game packages once their reducers are available.

4. Build `tests/simulations`.
   - Implement a PR-sized deterministic corpus using scripted agents only.
   - Add one scenario set per supported seat mode and per game.
   - Add a larger nightly/manual corpus for longer runs, stress cases, and statistical sanity checks.

5. Build `tests/e2e`.
   - Add Playwright config, Linux/Chromium CI settings, retries on CI, and trace-on-first-retry.
   - Boot the web, room, and API processes through stable workspace scripts rather than bespoke shell commands.
   - Cover the flagship Auction flow first, then reconnect, leaderboard, and payments smoke once those paths exist.

6. Add GitHub Actions workflows.
   - `ci.yml` on `pull_request` and `push` to the main integration branch.
   - Job order: install/setup, static quality gates, room/simulation tests, then browser E2E.
   - Use `actions/setup-node` with npm caching, `npm ci`, and artifact upload for Playwright traces and reports.
   - Keep required checks stable in name and avoid workflow-level path skipping for them.

7. Add a heavier non-blocking CI layer.
   - Add a scheduled or manual workflow for extended simulations, room load tests, and optional broader browser coverage.
   - Use the same seeded fixtures and scripted agents so failures are reproducible locally.
   - Promote slices from nightly to required PR checks only after they are consistently stable.

## Acceptance Criteria

- `tests/room`, `tests/simulations`, and `tests/e2e` are executable workspaces, and root test commands fail when any owned suite fails.
- A clean checkout can run `npm ci`, the root static gates, and all required test suites without ad hoc local setup.
- Required CI on pull requests covers:
  - lint and typecheck
  - room tests
  - simulation tests for the mandatory seat modes
  - one flagship browser E2E flow for `The Auction`
- Room tests prove that private seat metadata never appears in client-visible payloads and that replay output is deterministic for fixed seeds and action sequences.
- Simulation tests use offline scripted agents only and never depend on live network access to model providers.
- Browser E2E failures upload Playwright reports and traces for debugging.
- A heavier nightly or manual workflow exists for larger simulations and load-oriented room checks.

## Risks

- The current repo can produce false-green quality signals because root scripts are no-ops today. The first QA milestone must fix execution wiring before any reported green status is trusted.
- Cross-workstream E2E will stall if `apps/web`, `apps/rooms`, and `apps/api` do not expose stable startup commands and selectors. QA/CI depends on those interfaces early.
- Mixed human/LLM scenarios will become flaky if CI uses live model calls or real timing. The mitigation is strict use of scripted adapters, fake clocks, and seeded fixtures in required suites.
- Replay determinism can fail for subtle reasons such as clock usage, random sources, or transport ordering. Room and simulation tests must treat these as primary invariants, not secondary checks.
- Load testing too early can burn CI time without signal because the room transport is still evolving. Keep load workflows non-blocking until the authoritative room loop is stable.
- Broad browser matrices will slow feedback while the app surface is still changing quickly. Start with Linux plus Chromium in required CI and widen only when the flagship flow is stable.
