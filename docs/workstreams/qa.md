# QA and CI Workstream

## Owns

- test policy
- CI matrix and sharding strategy
- shared fixtures under `tests`

## Must Not Own

- product UX
- game rules themselves

## Responsibilities

- define minimum test bar for all streams
- create room-level test conventions
- create Playwright multi-client strategy
- create hidden-seat leak checks
- define load-test gates for demo rooms

## Research Focus

- Colyseus testing and load-test support
- Playwright parallelization and sharding
- deterministic fake-LLM fixtures

## Acceptance Criteria

- every game has unit, replay, simulation, and E2E coverage
- hidden backing metadata is never exposed to clients
- CI can shard test suites without changing outcomes

