# Agent Runbook

All parallel planning agents should follow these rules:

- Read `docs/coordination/SHARED_CONTEXT.md`, `docs/coordination/WORKSTREAMS.md`, and `IMPLEMENTATION_PLAN.md` first.
- Only write to the single planning file assigned to the workstream in `docs/plans/`.
- Do not edit shared contracts or other workstream files while planning.
- Use web research where technical decisions are time-sensitive or licensing-specific.
- Prefer primary or official sources for technical claims.
- Produce a detailed but execution-focused plan:
  - scope
  - owned paths
  - dependencies
  - research-backed implementation choices
  - acceptance criteria
  - key risks

The planning phase is successful when all workstream files can be read together without interface conflicts.
