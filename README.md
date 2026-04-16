# ARENA

This repository contains the coordination and workspace scaffold for a multiplayer human-vs-hidden-LLM game platform.

Start here:

- [IMPLEMENTATION_PLAN.md](/Users/aant/repos/human-llm-interaction/IMPLEMENTATION_PLAN.md)
- [docs/coordination/SHARED_CONTEXT.md](/Users/aant/repos/human-llm-interaction/docs/coordination/SHARED_CONTEXT.md)
- [docs/coordination/WORKSTREAMS.md](/Users/aant/repos/human-llm-interaction/docs/coordination/WORKSTREAMS.md)
- [docs/coordination/AGENT_RUNBOOK.md](/Users/aant/repos/human-llm-interaction/docs/coordination/AGENT_RUNBOOK.md)
- [docs/asset-governance.md](/Users/aant/repos/human-llm-interaction/docs/asset-governance.md)
- [THIRD_PARTY_ASSETS.md](/Users/aant/repos/human-llm-interaction/THIRD_PARTY_ASSETS.md)

Current repository intent:

- Build all games as authoritative multiplayer rooms.
- Treat every participant as a blinded `seat` backed by either a human client or an LLM runtime.
- Keep game modules deterministic and replayable.
- Split work into modular packages so teams can build in parallel without interface churn.

Supplemental detail also exists in:

- [docs/implementation-plan.md](/Users/aant/repos/human-llm-interaction/docs/implementation-plan.md)
- [docs/workstream-registry.md](/Users/aant/repos/human-llm-interaction/docs/workstream-registry.md)
- [docs/asset-policy.md](/Users/aant/repos/human-llm-interaction/docs/asset-policy.md)
