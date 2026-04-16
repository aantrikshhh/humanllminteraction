# LLM Runtime Plan

## Scope

Own:

- `packages/agents`
- server-only provider helper code consumed by `apps/rooms`

Do not own:

- client-visible schemas
- game-specific UI
- player-facing model disclosure

## Goals

- backfill empty seats with LLMs through one adapter boundary
- keep model and prompt metadata server-side
- smooth response timing enough to avoid obvious identity tells
- provide deterministic fake adapters for CI and simulations

## Runtime Shape

- adapter registry keyed by provider or adapter id
- per-game prompt version map
- timing profile map for minimum delay and jitter
- fallback chain for retry and provider degradation

## Implementation Steps

- define provider-agnostic request/response types in `packages/agents`
- add a fake seeded adapter for CI before any live provider integration
- add wrappers for timeout, retry, fallback, and budget enforcement
- emit private telemetry for model id, prompt version, latency, token usage, and fallback reason

## Acceptance Criteria

- partially filled rooms can be backfilled by LLM seats through a stable interface
- CI runs without live model APIs
- provider metadata never appears in public room payloads
- runtime failures degrade gracefully instead of crashing rooms

## Risks

- provider outages on demo day
- synthetic seats acting too fast or too uniformly
- prompt drift across games if versions are not logged centrally
