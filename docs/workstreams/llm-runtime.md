# LLM Runtime Workstream

## Owns

- `packages/agents`
- provider integration layer used by `apps/rooms`

## Must Not Own

- client UI
- public seat representation
- game-specific rendering

## Responsibilities

- implement model adapter abstraction
- design prompt version registry per game
- normalize response timing to avoid obvious identity leaks
- implement timeout, retry, fallback, and budget policies
- expose a generic move interface to room logic

## Research Focus

- provider adapter shape
- latency smoothing strategies
- deterministic fake-LLM test adapters
- safety and observability around cost and failures

## Interfaces Published

- `requestMove(seat, state)`
- model registry
- prompt metadata schema
- private telemetry payloads

## Dependencies

- `packages/contracts`
- `packages/game-sdk`

## Acceptance Criteria

- room server can backfill missing seats with LLMs through a stable interface
- fake adapters exist for CI and simulations
- provider metadata stays server-side
- prompt and model versions are logged privately for evaluation

