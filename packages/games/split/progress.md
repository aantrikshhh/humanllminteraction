Original prompt: Build the Split game slice as a deterministic multiplayer-ready module plus a thin route UI, staying within the split-owned paths only.

- Implemented a repeated 2-seat ultimatum game with alternating proposer/responder roles across 4 rounds.
- Public state includes only seat-facing data, scores, roles, current offer, and round history. No backing-type metadata is exposed.
- Added a smoke test that covers accept/reject progression and final scoring.
- Added a thin Next route that renders a sample public room state and game explanation without assuming live transport.
- Upgraded the public-state shape with fairness bands, agreement-rate telemetry, and average-offer-share summaries so the page can render clearer strategy signals without leaking seat backing.
- Rebuilt the standalone Split route as a stronger pitch/demo surface with live-room awareness, a more deliberate visual system, and room-facing explanations of what stays public versus hidden.
- Expanded split-only smoke coverage to validate both a score-winning scenario and a full deadlock scenario with low-offer rejection analytics.

TODOs
- Wire `splitModule` into the room runtime when the main thread is ready to register more game modules.
- Replace the current sample-room content blocks with a direct live-room replay strip once replay summaries are stable across routes.
