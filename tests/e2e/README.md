# Browser E2E Smoke Suite

Owned by the `QA/CI` workstream.

## Short Plan

1. Keep the suite self-contained under `tests/e2e` so it does not require app or manifest edits.
2. Use Playwright Test with official `webServer` orchestration so the suite can boot `@arena/api`, `@arena/rooms`, and `@arena/web` itself.
3. Cover the two highest-value product paths that exist today:
   - live lobby -> room shell
   - completed room -> results page
4. Capture debuggable artifacts by default on failure: traces, screenshots, and an HTML report.

## Research Notes

- Official Playwright guidance supports a `webServer` config for starting local services before tests run. That fits this repo better than asking contributors to start three dev servers manually.
- Official Playwright guidance recommends traces for debugging failures; this suite keeps traces on failure and writes the HTML report under `tests/e2e/artifacts/`.
- Because the current product already exposes a same-origin room proxy and a read-only results surface, the smoke suite can stay black-box from the browser perspective while using API requests only to seed a completed room for deterministic results coverage.

## Coverage

- `arena.smoke.spec.ts`
  - creates a demo Auction room from `/lobby`
  - opens the live room shell
  - verifies blinded-seat/operator UI is present
  - submits one Auction action through the browser and confirms the room message request succeeds
  - seeds a second Auction room through the rooms runtime
  - advances it to `results`
  - loads `/results/[roomId]`
  - verifies standings, replay availability, and seat-blinded result copy

## Files

- `tests/e2e/playwright.config.mjs`
- `tests/e2e/arena.smoke.spec.ts`
- `tests/e2e/run-smoke.sh`
- `tests/e2e/.gitignore`

## How To Run

Default browser path:

```bash
./tests/e2e/run-smoke.sh
```

The suite uses the locally installed Google Chrome channel by default so it can run without changing repo manifests or provisioning a bundled browser first.

If Chrome is unavailable on a machine, install Playwright Chromium once:

```bash
npx --yes playwright@1.55.0 install chromium
```

Run the smoke suite:

```bash
./tests/e2e/run-smoke.sh
```

Useful options:

```bash
./tests/e2e/run-smoke.sh --headed
./tests/e2e/run-smoke.sh -g "lobby"
./tests/e2e/run-smoke.sh --project=chromium
PLAYWRIGHT_CHANNEL=chromium ./tests/e2e/run-smoke.sh
```

Open the HTML report after a run:

```bash
npx --yes playwright@1.55.0 show-report tests/e2e/artifacts/report
```

Open a saved trace:

```bash
npx --yes playwright@1.55.0 show-trace tests/e2e/artifacts/test-results/<test-folder>/trace.zip
```

## Artifacts

- HTML report: `tests/e2e/artifacts/report/`
- Failure traces/screenshots: `tests/e2e/artifacts/test-results/`

## Current Blockers

- The suite intentionally covers the current MVP shell only. It does not test join, seat-claim, or ready-up because those flows are not wired yet.
- The live room surface is Auction-first. Other games are not actionable from the room shell yet, so smoke coverage is intentionally focused on Auction.
- Match-level leaderboard deltas and payout records are not queryable by `roomId` yet, so the results smoke test can only assert the current public placeholders, not a finalized per-match settlement payload.
