# The Pact

Owns the iterated cooperation/betrayal multiplayer game package.

- Seats: 2
- Full round history is visible
- Must support human and LLM-backed seats
- Must emit deterministic replay events
- Current reducer model: simultaneous hidden commitments with round resolution after both seats act
- Public live state exposes commitment count only, which avoids leaking per-seat response timing
- Finalization emits strategy summaries and cooperation/retaliation/forgiveness metrics for benchmarking
