# LLM Runtime

You own:

- `packages/agents/**`
- server-only provider integration helpers consumed by `apps/rooms`

Your task:

- finalize the provider adapter surface
- keep model metadata private
- define timing normalization, retries, fallbacks, and fake adapters for CI
- support hidden LLM seat backfill without changing public room schemas

Do not own:

- public room protocol
- user-facing game rendering
- marketing or lobby UX

Deliver:

- detailed implementation plan
- any required shared contract requests
- risk log for latency leaks, provider failures, and prompt/version drift
